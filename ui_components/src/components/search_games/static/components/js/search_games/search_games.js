var Example = {};

function extend(child, parent) {
    var F = function () {
    };
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
    child.superclass = parent.prototype;
}

/**
 * Example component.
 */
Example.DrawComponent = {
    ext_lang: 'ui_game_search',
    formats: ['format_ui_game_search_json'],
    struct_support: true,
    factory: function (sandbox) {
        return new Example.DrawWindow(sandbox);
    }
};

Example.DrawWindow = function (sandbox) {
    this.sandbox = sandbox;
    this.paintPanel = new Example.PaintPanel(this.sandbox.container);
    this.paintPanel.init();
    this.recieveData = function (data) {
        console.log("in recieve data" + data);
    };

    var scElements = {};

    function drawAllElements() {
        var dfd = new jQuery.Deferred();
       // for (var addr in scElements) {
            jQuery.each(scElements, function(j, val){
                var obj = scElements[j];
                if (!obj || obj.translated) return;
// check if object is an arc
                if (obj.data.type & sc_type_arc_pos_const_perm) {
                    var begin = obj.data.begin;
                    var end = obj.data.end;
                    // logic for component update should go here
                }

        });
        SCWeb.ui.Locker.hide();
        dfd.resolve();
        return dfd.promise();
    }

// resolve keynodes
    var self = this;
    this.needUpdate = false;
    this.requestUpdate = function () {
        var updateVisual = function () {
// check if object is an arc
            var dfd1 = drawAllElements();
            dfd1.done(function (r) {
                return;
            });


/// @todo: Don't update if there are no new elements
            window.clearTimeout(self.structTimeout);
            delete self.structTimeout;
            if (self.needUpdate)
                self.requestUpdate();
            return dfd1.promise();
        };
        self.needUpdate = true;
        if (!self.structTimeout) {
            self.needUpdate = false;
            SCWeb.ui.Locker.show();
            self.structTimeout = window.setTimeout(updateVisual, 1000);
        }
    }
    
    this.eventStructUpdate = function (added, element, arc) {
        window.sctpClient.get_arc(arc).done(function (r) {
            var addr = r[1];
            window.sctpClient.get_element_type(addr).done(function (t) {
                var type = t;
                var obj = new Object();
                obj.data = new Object();
                obj.data.type = type;
                obj.data.addr = addr;
                if (type & sc_type_arc_mask) {
                    window.sctpClient.get_arc(addr).done(function (a) {
                        obj.data.begin = a[0];
                        obj.data.end = a[1];
                        scElements[addr] = obj;
                        self.requestUpdate();
                    });
                }
            });
        });
    };
// delegate event handlers
    this.sandbox.eventDataAppend = $.proxy(this.receiveData, this);
    this.sandbox.eventStructUpdate = $.proxy(this.eventStructUpdate, this);
    this.sandbox.updateContent();
};
SCWeb.core.ComponentManager.appendComponentInitialize(Example.DrawComponent);
/**
 * Paint panel.
 */

let selected_genre = "concept_computer_game";

function find(self,container) {

    let getAllGamesID = self._moba();
	
	let getAllGamesName = getAllGamesID.then((array) => {
		collectionOfGameSctpID = array;
		return self._getName(array);
	});

    	Promise.all([getAllGamesName]).then((result) => {
            setTimeout(function(){
                	self._configurateTable(result[0], collectionOfGameSctpID,  container);
                		},500)
            	
         })

}

Example.PaintPanel = function (containerId) {
    this.containerId = containerId;
};

Example.PaintPanel.prototype = {

    init: function () {
        this._initMarkup(this.containerId);
    },

    _initMarkup: function (containerId) {
        var container = $('#' + containerId);

        var self = this;
		
		container.append('<div><input type = "text" id = "search_text_field" placeholder = "Введите название игры" display:inline-block> <button id = "find_by_text" type = "button" display:inline-block>FIND</button></div>');


		SCWeb.core.Server.resolveScAddr(['ui_menu_na_keynodes'], function (keynodes) {
			$('#moveToNavigationNode').attr("sc_addr", keynodes['ui_menu_na_keynodes']);
		});


		$('#find_by_text').click(function () {
			find(self, container);
		});
	},

	_configurateTable: function (array_of_game_names, collectionOfGameSctpID, container) {
		console.log("Составляем таблицу");

		if (container[0].lastChild === document.getElementsByTagName("table")[0]) {
			console.log(`не первый раз`);
			container[0].lastChild.remove();
		}

		let insertIntoTable = `<tr><th onclick="sortTable(0)">название игры</th><th onclick="sortTable(1)">издатель</th><th onclick="sortTable(2)">разработчик</th><th onclick="sortTable(3)">платформа</th></tr>`;



		for (let i = 0; i < array_of_game_names.length; i += 1) {
			insertIntoTable += '<tr style = "border: 1px solid black">';
			insertIntoTable += `<td style = "border: 1px solid black"><a href = "${collectionOfGameSctpID[i]}" class = "link_internal"> ${array_of_game_names[i]}</a></td>`;

			insertIntoTable += '</tr>';
		}
		container.append('<table id = "table" style = "border: 1px solid black  border-collapse: collapse">' + insertIntoTable + '</table>');
		return true;
	},

	_getName: function (array_of_sctp_ID) {

		let nameArray = [];

		let main_menu_addr, nrel_main_idtf_addr;

		let promise = new Promise(function (resolve, reject) {

			SCWeb.core.Server.resolveScAddr(['nrel_main_idtf'], function (keynodes) {

				for (let i = 0; i < array_of_sctp_ID.length; i += 1) {

					main_menu_addr = array_of_sctp_ID[i];
					nrel_main_idtf_addr = keynodes['nrel_main_idtf'];

					window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_5F_A_A_A_F, [
						main_menu_addr,
						sc_type_arc_common | sc_type_const,
						sc_type_link,
						sc_type_arc_pos_const_perm,
						nrel_main_idtf_addr])
						.done(function (identifiers) {
							window.sctpClient.get_link_content(identifiers[0][2], 'string').done(function (content) {
								nameArray[i] = content;
							})

						});
					if (i === array_of_sctp_ID.length - 1) {
						resolve(nameArray);
					}
				}

			});
		});
		return promise;
	},

	_moba: function () {
		let promise = new Promise(function (resolve, reject) {
			let gGameNamesID = [];
			var main_menu_addr;
			// Resolve sc-addrs.
			SCWeb.core.Server.resolveScAddr([selected_genre], function (keynodes) {
				main_menu_addr = keynodes[selected_genre];

				// Resolve sc-addr of ui_menu_view_full_semantic_neighborhood node
				window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_A, [
					main_menu_addr,
					sc_type_arc_access | sc_type_const | sc_type_arc_pos | sc_type_arc_perm,
					sc_type_node | sc_type_const | sc_type_node_class])
					.done(function (identifiers) {

						for (let i = 0; i < identifiers.length; i++) {
							gGameNamesID.push(identifiers[i][2]);
						}

						if (gGameNamesID.length === identifiers.length) {

							resolve(gGameNamesID);

						} else if (gGameNamesID.length) {

							reject("not found");

						}
					});
			});
		});
		return promise;
	}
};