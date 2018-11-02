var HtmlTableEditing = function (tableDOM, options)  {
	let that = this;

	// for selection
	this.selectedRow = []; // an array of RowDOMEl
	this.data = [];
	/*	
		{
	ROW num =>	'1': {	
					columnName: {
						domRef: ,

					},
					columnName2: {

					}
				},
				'5': {

				}
		}
			
		
		
	*/
	let defaultOptions = {
		saveMod: 'instantSave'
			/*
				instantSave:  save just after one inline change
				modifyThenSave:  cache changes, then by a trigger save all the changes,
				smartSave:  combination of both the above,  auto save and caching, with a timeout  =>> it cache then if no modification after a delay, the cached data is saved! 
			*/
			,
		editMod: 'inlinceCell'
			/*
				inlineCell: edit by cell  inline,
				inlineRow: edit inline by row,
				popUpRow: edit by a popup row,
				popUpMultiRow: add selection and then modify the selected one
			*/
			,
		columns: null
			/* 
				[
					{
						name: ,
						type: 
					},
					{

					},
					{

					}
				]
			*/
			,
		rowHeaderColumn: false,
		ajax: null,
		/**
			defaultUrl: ''
		 */
		cell: {
			error: {
				popClass: 'cell_errorPop'
			}
		}
	}

	options = Object.assign({}, defaultOptions, options);

	// overiding and joining back cell options object 

	options.cell = Object.assign({}, defaultOptions.cell, options.cell);

	// and here error options object
	options.cell.error = Object.assign({}, defaultOptions.cell.error, options.cell.error);

	let events = {
		editCellTriggered: null,
		editCellUpdate: null, //(cell, updatedValueinnerHTML)
		updateCell: null
	}
	/*
	how to cache changes to be saved!

	==> well they are only json data, that will be sent! and the server side will handle them, to make it easy for spliting the logic, we send too the saveMod along, this way the server side will treat it following that.

	=> we keep appending changes to a data array and we make sure to search first if the element alrady exist in the array so that we don't send to save data of same cell twice! 
	*/

	this.init = function () {
		this.theadDOM = tableDOM.getElementsByTagName('thead')[0];
		this.headRowDOM = this.theadDOM.getElementsByTagName('tr')[0];
		this.tbodyDOM = tableDOM.getElementsByTagName('tbody')[0];

		this.tableCache = [];
		this.init_Cell_cacheRowColumnsHeadersAndPos();
		this.init_editInputDOMElmsCreation();
	}

	this.init_Cell_cacheRowColumnsHeadersAndPos = function () {
		let rows = this.tbodyDOM.getElementsByTagName('tr');
		for (let i = 0; i < rows.length; i++) {
			let row = rows[i];
			for (let j = 0; j < row.children.length; j++) {
				let cell = row.children[j];
				cell.columnHeader = {
					dom: this.headRowDOM.children[j],
					innerHTML: this.headRowDOM.children[j].innerHTML,
					name: this.getColumnName(j),
					index: j
				};
				cell.index = j;
			}

			// row caching
			let rowTh = row.children[0];
			if (rowTh.tagName.toLowerCase() === 'th') { // only if there is a header // make sure before using it to check if it's there (have an api for it it's the best way)
				row.rowHeader = {
					dom: rowTh,
					innerHTML: rowTh.innerHTML,
					index: i
				};
			} else if (options.rowHeaderColumn !== false) {
				rowTh = row.children[options.rowHeaderColumn];
				row.rowHeader = {
					dom: rowTh,
					innerHTML: rowTh.innerHTML,
					index: i
				};
			}
			row.index = i;
		}
	}

	this.getRowIndex = function (rowDOM) {
		if (rowDOM.hasOwnProperty('index')) {
			return rowDOM.index;
		} else {
			rowDOM.index = Array.prototype.indexOf.call(Arraythis.tbodyDOM.children, rowDOM);
			return rowDOM.index;
		}
	}

	this.getRowHeader = function (rowDOM) {
		if (rowDOM.hasOwnProperty('rowHeader')) {
			return rowDOM.rowHeader;
		} else {
			let rowTh = rowDOM.children[0];
			if (rowTh.tagName.toLowerCase() === 'th') {
				rowDOM.rowHeader = {
					dom: rowTh,
					innerHTML: rowTh.innerHTML,
					index: this.getRowIndex()
				}
				return rowDOM.rowHeader;
			} else if (options.rowHeaderColumn !== false) {
				let rowTh = rowDOM.children[options.rowHeaderColumn];

				rowDOM.rowHeader = {
					dom: rowTh,
					innerHTML: rowTh.innerHTML,
					index: this.getRowIndex()
				}
				return rowDOM.rowHeader;
			}
			return null;
		}
	}


	this.init_editInputDOMElmsCreation = function () {
		//inlineCellEdit
		this.inlineCellEdit = document.createElement('input');
		this.inlineCellEdit.id = "inlineCellEdit";
		this.inlineCellEdit.value = '';
		this.inlineCellEdit.addEventListener("keydown", this.inlineCellEdit_updateCallBack);
	}


	this.getColumnName = function (columnIndex) {
		if (options.columns && options.columns[columnIndex].hasOwnProperty('name')) {
			return options.columns[columnIndex].name;
		}
		return null;
	}

	this.getColumnType = function (columnIndex) {
		if (options.columns && options.columns[columnIndex].hasOwnProperty('type')) {
			return options.columns[columnIndex].type;
		}
		return null;
	}

	this.getColumnHeadByIndex = function (cellPosInRow) {
		return this.headRowDOM.children[cellPosInRow];
	}

	this.getCellColumnIndex = function (cellDOM) {
		if (!cellDOM.hasOwnProperty('index')) {
			return cellDOM.index;
		} else {
			return Array.prototype.indexOf.call(cellDOM.parentNode, cellDOM);
		}
	}

	this.getCellColumnHeader = function (cellDOM) {
		if (cell.hasOwnProperty('columnHeader')) {
			return cellDOM.columnHeader;
		} else {
			let rowDOM = cellDOM.parentNode;
			let index = Array.prototype.indexOf.call(rowDOM, cellDOM);
			cellDOM.columnHeader = {
				dom: this.headRowDOM.children[index],
				innerHTML: this.headRowDOM.children[index].innerHTML,
				name: this.getColumnName(index),
				index: index
			};
			return cellDOM.columnHeader;
		}
	}



	this.cellOnEditing = null;
	this.cellEditingOn = false;
	this.editCell = function (cellDOM) {
		if (this.cellEditingOn) { // if we clicked another cell, then we save update the already on editing one then we go for the new one
			this.editUpdate();
		}

		this.cellEditingOn = true;
		// console.log("cellinner : ");
		// console.log(cellDOM.innerHTML);
		this.cellOnEditing = {
			dom: cellDOM,
			lastInner: cellDOM.innerHTML
		};
		this.editInput(cellDOM);
	}

	this.editInput = function (cellDOM) {
		let index = this.getCellColumnIndex(cellDOM);
		let columnType = this.getColumnType(index);
		if (columnType) {
			// here go the treatement of the different input type!
		} else {
			// console.log("this.cellOnEditing.lastInner = ");
			// console.log(this.cellOnEditing.lastInner);
			this.inlineCellEdit.value = this.cellOnEditing.lastInner;
			cellDOM.innerHTML = '';
			cellDOM.append(this.inlineCellEdit);
			this.inlineCellEdit.focus();
		}
	}


	this.editUpdate = function () {
		let cell = this.cellOnEditing.dom;
		// console.log("cellOnEditing dom = "); 
		// console.dir(cell);
		cell.removeChild(this.inlineCellEdit);
		cell.innerHTML = this.inlineCellEdit.value;
		this.cellEditingOn = false;

		if (cell.innerHTML !== this.cellOnEditing.lastInner) { // we trigger the update event (one used to send to the database) only if the value was changed! 
			events.editCellUpdate(cell, cell.innerHTML, this.cellOnEditing.lastInner);
		}

	}

	this.inlineCellEdit_updateCallBack = function (event) {
		if (event.which == 13 || event.keyCode == 13) { //enter
			that.editUpdate();
			return false;
		}
		if (event.which == 27 || event.keyCode == 27) { // ECHAP
			that.cancelEdit();
			return false;
		}
		return true;
	}

	this.cancelEdit = function () {
		let cell = this.cellOnEditing.dom;
		cell.removeChild(this.inlineCellEdit);
		cell.innerHTML = this.cellOnEditing.lastInner;
		this.cellEditingOn = false;
	}

	this.undoAfterFailedSave = function (cell, value) {
		cell.innerHTML = value;
	}

	// we handle ajax through events! and we do it for both edit update and updatecell => update cell in case of automatic update to database, like with a button click,  like reset or such a thing
	this.updateCell = function (cellDOM, innerHTML) {

	}


	this.ajax = function (ajaxObj) {
		let url;
		if (ajaxObj.hasOwnProperty('url')) {
			url = ajaxObj.url;
		} else {
			if (options.hasOwnProperty('ajax') && options.ajax.hasOwnProperty('url')) {
				url = options.ajax.url;
			} else {
				throw 'no ajax url was precised';
			}
		}

		let ajaxDefault = {
			url: url,
			data: null,
			/**
							{
								key: value, 
								key2: value2
							}
						*/
			method: 'POST',
			type: 'application/json', // contentType
			responseType: null,
			headers: null,
			/**
						{
							'headerName': 'value',
							'User-Agent': ,
							'Content-Type'
						}
						*/
			async: true,
			success: null,
			/**
							callback format :  callback(xhr, response)
						*/
			error: null
				/**
								callback format : callback(xhr, response)
							*/
				,
			complete: null
				/**
				callback format : callback(xhr, response)
			*/
				,
			events: null
			/**
				{
					eventName: callback,
					eventNAME: CALLback
				}
			*/
		}

		ajaxObj = Object.assign({}, ajaxDefault, ajaxObj);

		let xhr = new XMLHttpRequest();

		xhr.onreadystatechange = function () {
			if (xhr.readyState < 4) {
				//handle preload 
				return;
			}

			if (ajaxObj.complete) {
				ajaxObj.complete(xhr);
			}

			if (xhr.status !== 200) {
				// here go handling error
				if (ajaxObj.error) {
					ajaxObj.error(xhr, xhr.status);
				}

				return;
			}

			if (xhr.readyState === 4) {
				// handling success
				if (ajaxObj.success) {
					ajaxObj.success(xhr, that.ajax_readResponse(xhr));
				}
			}
		}

		// set events handlers if provided
		if (ajaxObj.events) {
			for (let eventName in ajaxObj.events) {
				xhr.addEventListener(eventName, ajaxObj.events[eventName]);
			}
		}


		xhr.open(ajaxObj.method, ajaxObj.url, ajaxObj.async);

		//set type header
		xhr.setRequestHeader('Content-Type', ajaxObj.type);

		// set all other headers
		if (ajaxObj.headers) {
			if (ajaxObj.headers.hasOwnProperty('Content-Type')) {
				delete ajaxObj.headers['Content-Type'];
			}

			for (let headerName in ajaxObj.headers) {
				xhr.setRequestHeader(headerName, ajaxObj.headers[headerName]);
			}
		}

		// set response type
		if (ajaxObj.responseType) {
			xhr.responseType = ajaxObj.responseType;
		}

		// format data to be sent if there is
		let formatedData = null;

		if (ajaxObj.data) {
			formatedData = this.ajax_formatData(ajaxObj.type, ajaxObj.data);
		}

		xhr.send(formatedData);
	}

	this.ajax_urlEncType = function () {
		return 'application/x-www-form-urlencoded';
	}

	this.ajax_formdataType = function () {
		return 'application/form-data';
	}

	this.ajax_jsonType = function () {
		return 'application/json';
	}

	this.ajax_formatData = function (type, data) {
		let formatedData;
		if (type === 'application/json') {
			formatedData = JSON.stringify(data);
		} else if (type === 'application/x-www-form-urlencoded') {
			formatedData = paramToUrlEncoded(data);
		} else if (type === 'application/form-data') {
			let fd = new FormData();
			for (let name in data) {
				fd.append(name, data[name]);
			}
			formatedData = fd;
		} else {
			formatedData = data;
		}

		return formatedData;
	}

	this.ajax_readResponse = function (xhr) {
		var data;
		if (!xhr.responseType || xhr.responseType === "text") {
			data = xhr.responseText;
		} else if (xhr.responseType === "document") {
			data = xhr.responseXML;
		} else {
			data = xhr.response;
		}
		return data;
	}

	this.ajax_errorTextFromStatus = function (status) {
		switch (status) {
			case 404:
				return 'File not found (error 404)';
				break;
			case 500:
				return 'Server error (error 500)';
				break;
			case 0:
				return 'Request aborted (error 0)';
				break;
			default:
				return 'Unknown error' + status;
		}
	}

	function paramToUrlEncoded(object) {
		var encodedString = '';
		for (var prop in object) {
			if (object.hasOwnProperty(prop)) {
				if (encodedString.length > 0) {
					encodedString += '&';
				}
				encodedString += encodeURI(prop + '=' + object[prop]);
			}
		}
		return encodedString;
	}


	this.editUpdateError = function (cell, errorMessage) {
		let errorPopObj = this.cell_createErrorPop(errorMessage);
		this.cell_showErrorPop(cell, errorPopObj);
	}

	this.cell_createErrorPop = function (errorMessage) {
		let div = document.createElement('div');
		div.className = options.cell.error.popClass;
		let closeButton = document.createElement('div');
		closeButton.className = 'clsbtn';
		let btnSpan = document.createElement('span');
		btnSpan.innerHTML = 'X';
		closeButton.append(btnSpan);

		let messageP = document.createElement('p');
		messageP.innerHTML = errorMessage;

		// pointing ancre
		let upAncre = document.createElement('i');
		upAncre.className = 'upAncre';

		let downAncre = document.createElement('i');
		downAncre.className = 'downAncre';

		div.append(closeButton, messageP, upAncre, downAncre);

		closeButton.addEventListener('click', function () {
			that.cell_removeErrorPop(div);
		});

		return {
			errorPop: div,
			upAncre: upAncre,
			downAncre: downAncre,
			closeButton: closeButton
		};
	}

	this.cell_showErrorPop = function (cell, errorPopObj) {
		let errorPop = errorPopObj.errorPop;
		let upAncre = errorPopObj.upAncre;
		let downAncre = errorPopObj.downAncre;

		addClass(errorPop, 'beforeShow');
		document.body.append(errorPop);
		if (cell.offsetTop - errorPop.offsetHeight > 20) { // pop from top
			errorPop.style.top = cell.offsetTop - errorPop.offsetHeight + 10 + 'px';
			// show downAncre hide upancre
			upAncre.style.display = 'none';
			downAncre.style.display = 'unset';
		} else { // pop from bellow
			errorPop.style.top = cell.offsetTop + cell.offsetHeight + 5 + 'px';
			//show upAncre hide downAncre
			upAncre.style.display = 'unset';
			downAncre.style.display = 'none';
		}
		if (cell.offsetLeft + errorPop.offsetWidth + 20 < tableDOM.offsetWidth) { // pop to right
			errorPop.style.left = cell.offsetLeft - 20 + 'px';
			upAncre.style.left = '35px';
			downAncre.style.left = '35px';
		} else {
			errorPop.style.left = cell.offsetLeft - errorPop.offsetWidth + cell.offsetWidth * 0.8 + 'px';

			upAncre.style.left = errorPop.offsetWidth - cell.offsetWidth * 0.63 + 'px';
			downAncre.style.left = errorPop.offsetWidth - cell.offsetWidth * 0.63 + 'px';
		}


		setTimeout(() => {
			removeClass(errorPop, 'beforeShow');
		}, 10);
	}

	this.cell_removeErrorPop = function (errorPop) {
		addClass(errorPop, 'beforeShow');
		setTimeout(() => {
			removeClass(errorPop, 'beforeShow');
			addClass(errorPop, 'hide');
			errorPop.parentNode.removeChild(errorPop);
			delete errorPop;
		}, 400);
	}



	this.on = function (eventType, callback) {
		if (events.hasOwnProperty(eventType)) {
			events[eventType] = callback;
		} else {
			throw 'there is no such event'
		}
	};

	this.init();
}


function is_containedIn_OrEqual(contained, container) {
	var node = contained;
	while (node != null) {
		if (node === container) {
			return true;
		}
		node = node.parentNode;
	}
	return false;
}


function isWithinAnElOfTagType_get(elementDOM, tags, stopSearchUpperParrentDOM) {
	if (isOfTagName(elementDOM, tags)) {
		return elementDOM;
	}

	while (!isOfTagName(elementDOM, tags)) {
		if (stopSearchUpperParrentDOM == elementDOM) {
			return false;
		}

		elementDOM = elementDOM.parentNode;
	}
	return elementDOM;
}

function isOfTagName(DOMel, tagsNames) {
	if (typeof tagsNames === 'string') {
		if (DOMel.tagName.toLowerCase() === tagsNames.toLowerCase()) return true;
		else return false;
	} else {
		for (let i = 0; i < tagsNames.length; i++) {
			if (DOMel.tagName.toLowerCase() === tagsNames[i].toLowerCase()) {
				return true;
			}
		}
		return false;
	}
}


function addClass(DOMElement, classes) {
	if (typeof classes === 'string') {
		if (!hasClass(DOMElement, classes)) {
			DOMElement.className += " " + classes;
		}
	} else if (Object.prototype.toString.call(classes) === "[object Array]") {
		for (let i = 0; i < classes.length; i++) {
			if (!hasClass(DOMElement, classes[i])) {
				DOMElement.className += " " + classes[i];
			}
		}
	}
	DOMElement.className = DOMElement.className.trim();
}

function removeClass(DOMElement, classes) {
	let classesInDOMElement = DOMElement.className.split(/\s+/);

	removeElementFromArray_Mutate(classesInDOMElement, classes);

	DOMElement.className = classesInDOMElement.join(' ');
}

function hasClass_ONEtest(DOMElement, classe) {
	let allClasses = DOMElement.className.split(/\s+/);
	for (let i = 0; i < allClasses.length; i++) {
		if (allClasses[i].trim() === classe) {
			return true;
		}
	}
	return false;
}

function hasClass(DOMElement, classes) {
	if (typeof classes === 'string') {
		return hasClass_ONEtest(DOMElement, classes);
	} else { // multiple classes as array
		for (let i = 0; i < classes.length; i++) {
			if (!hasClass_ONEtest(DOMElement, classes[i])) {
				return false;
			}
		}
		return true;
	}
}

function toggleClass(DOMElement, classes) {
	if (typeof classes === 'string') {
		toggleClass_one(DOMElement, classes);
	} else { // multiple classes as array
		for (let i = 0; i < classes.length; i++) {
			toggleClass_one(DOMElement, classes[i]);
		}
		return true;
	}
}

function toggleClass_one(DOMElement, classe) {
	if (hasClass_ONEtest(DOMElement, classe)) {
		removeClass(DOMElement, classe);
	} else { // don't have it
		addClass(DOMElement, classe);
	}
}

function removeElementFromArray_Mutate(sourceArray, elementsToRemoveArray) {
	if (Object.prototype.toString.call(elementsToRemoveArray) === '[object Array]') {
		for (let i = 0; i < elementsToRemoveArray.length; i++) {
			for (let j = 0; j < sourceArray.length; j++) {
				if (elementsToRemoveArray[i] === sourceArray[j]) {
					sourceArray.splice(j, 1);
					j--; //important whne we splice we don't go to the next element the element come to us
				}
			}
		}
	} else { // if not array then a string or number, or object or function or anything else (to test on an array of functions)
		for (let i = 0; i < sourceArray.length; i++) {
			if (sourceArray[i] === elementsToRemoveArray) {
				sourceArray.splice(i, 1);
				i--; //when we splice the next element will come to that position. so we need not to move
			}
		}
	}
}



// row inline editing (inline and popup)

// caching changes and after delay send them to be handled in server side!  with error pin pointing (just like with by one as it is now)   

// use RAM for caching! as a starter, later see a solution that manage very well caching! RAM + HARD  	and buffering

// create save in progress  and saved! little message top!


// rows index and column info for saving in database! (get the equivalent in the database (so it can be direcctly used) ==>  pagination may pose problem, => either request hidden id field!!!! )
// or in case datatable, => pagination pag num => number of rows per page ==> math => real database row idnex (we already are providing indexs for row and all!)  ==> in pagination refrech! (how to detect that and automaticaly handle it (referesh)) or make some function that let that be a breeze, like just pin pointing the pagination els and that's it.

//for rows and columns index and headers info ! ==> we are caching them in the dom objects ===> set in options ==> option to switch mode => cache and not cache (test no caching (no caching can be cool! no need for refresh)) (and for caching mode, don't forget to add refresh function and pagination handling. ( the simple thing as a start refresh function and the user will take care of writing the events with there handler and then just call for one line function call)) 

// build a plugin for datatable
//very optimised!



// add an option for precising what column represent row headers th (even if it's just td)

// add getInnerHtml(rowInd, columnINdex)
//and getInnerHtmlSameRow(columnIndex)

// option parameter make it optional (in place of {} when it's void)

























// // tableRow => DOMElement of  a row
// function inlineEdit(tableRow, options) {
// 	var inlineEditRowContents = [];
// 	for (var i=0; i<tableRow.childElementCount; i++) {
// 		var cell = tableRow.children[i];
// 		inlineEditRowContents[i] = cell.innerHTML;
// 		if (options.hasOwnProperty("updateCell"))
// 			options.updateCell(cell, options);
// 		else
// 			inlineDefaultUpdateCell(cell, inlineEditRowContents, i, options);
// 	}
// }

// function inlineDefaultUpdateCell(cell, inlineEditRowContents, i, options) {
// 	var attributesFilter = ["inlineoptionsvalue", "inlineoptionstitle"];
// 	var cellContent = "";
// 	var key;
// 	if (i === 0) {
// 		//cellContent += `<form id='${rowName}Form'></form>`;
// 	}
// 	switch (cell.dataset.inlinetype) {
// 		case "plain":
// 			cellContent += inlineEditRowContents[i];
// 			break;
// 		case "doneButton":
// 			cellContent += `<input type='submit' value='Finish'/>`;
// 			break;
// 		case "button":
// 			cellContent += inlineEditRowContents[i];
// 			break;
// 		case "link":
// 			cellContent += `<input type='text' value='${cell.innerText}'`;
// 			for (key in cell.dataset) {
// 				if (cell.dataset.hasOwnProperty(key) && key.substr(0, 6) == "inline" && attributesFilter.indexOf(key) == -1) {
// 					cellContent += ` ${key.substr(6)}='${cell.dataset[key]}'`;
// 				}
// 			}
// 			cellContent += "/>";
// 			break;
// 		case "text":
// 			cellContent += `<input type='text' value='${inlineEditRowContents[i]}' form='${rowName}Form'`;
// 			for (key in cell.dataset) {
// 				if (cell.dataset.hasOwnProperty(key) && key.substr(0, 6) == "inline" && attributesFilter.indexOf(key) == -1) {
// 					cellContent += ` ${key.substr(6)}='${cell.dataset[key]}'`;
// 				}
// 			}
// 			cellContent += "/>";
// 			break;
// 		case "date":
// 			cellContent += `<input type='date' value='${inlineEditRowContents[rowName][i]}' form='${rowName}Form'`;
// 			for (key in cell.dataset) {
// 				if (cell.dataset.hasOwnProperty(key) && key.substr(0, 6) == "inline" && attributesFilter.indexOf(key) == -1) {
// 					cellContent += ` ${key.substr(6)}='${cell.dataset[key]}'`;
// 				}
// 			}
// 			cellContent += "/>";
// 			break;
// 		case "select":
// 			cellContent += "<select";
// 			for (key in cell.dataset) {
// 				if (cell.dataset.hasOwnProperty(key) && key.substr(0, 6) == "inline" && attributesFilter.indexOf(key) == -1) {
// 					cellContent += ` ${key.substr(6)}='${cell.dataset[key]}'`;
// 				}
// 			}
// 			cellContent += ">";
// 			var optionsTitle = JSON.parse(cell.dataset.inlineoptionstitle);
// 			var optionsValue = cell.dataset.hasOwnProperty("inlineoptionsvalue") ? JSON.parse(cell.dataset.inlineoptionsvalue) : [];
// 			for (var j=0; j<optionsTitle.length; j++) {
// 				cellContent += "<option ";
// 				cellContent += ((optionsValue.length<=j) ? "" : `value='${optionsValue[j]}'`);
// 				cellContent += ((inlineEditRowContents[rowName][i] == optionsTitle[j]) ? " selected='selected'" : "");
// 				cellContent += ">";
// 				cellContent += optionsTitle[j];
// 				cellContent += "</option>";
// 			}
// 			cellContent += "</select>";
// 			break;
// 		case "textarea":
// 			cellContent += `<textarea form='${rowName}Form'`;
// 			for (key in cell.dataset) {
// 				if (cell.dataset.hasOwnProperty(key) && key.substr(0, 6) == "inline" && attributesFilter.indexOf(key) == -1) {
// 					cellContent += ` ${key.substr(6)}='${cell.dataset[key]}'`;
// 				}
// 			}
// 			cellContent += ">";
// 			cellContent += inlineEditRowContents[rowName][i];
// 			cellContent += "</textarea>";
// 			break;
// 		default:
// 			cellContent += inlineEditRowContents[rowName][i];
// 			break;
// 	}
// 	cell.innerHTML = cellContent;
// 	if (i === 0) {
// 		// set the onsubmit function of the form of this row
// 		document.getElementById(rowName+"Form").onsubmit = function () {
// 			event.preventDefault();
// 			if (this.reportValidity()) {
// 				if (options.hasOwnProperty("finish"))
// 					options.finish(rowName, options);
// 				else
// 					inlineDefaultFinish(rowName, options);
// 			}
// 		};
// 	}
// }

// function inlineDefaultFinish(rowName, options) {
// 	var tableRow = document.getElementById(rowName);
// 	var rowData = {};
// 	for (var i=0; i<tableRow.childElementCount; i++) {
// 		var cell = tableRow.children[i];
// 		var getFromChildren = (i === 0) ? 1 : 0;
// 		switch (cell.dataset.inlinetype) {
// 			case "plain":
// 				break;
// 			case "doneButton":
// 				break;
// 			case "button":
// 				break;
// 			case "link":
// 				rowData[cell.dataset.inlinename] = cell.children[getFromChildren].value;
// 				inlineEditRowContents[rowName][i] = "<a href='"+cell.dataset.inlinelinkformat.replace("%link%", cell.children[getFromChildren].value)+"'>"+cell.children[getFromChildren].value+"</a>";
// 				break;
// 			case "text":
// 			case "date":
// 				rowData[cell.dataset.inlinename] = cell.children[getFromChildren].value;
// 				inlineEditRowContents[rowName][i] = cell.children[getFromChildren].value;
// 				break;
// 			case "select":
// 				rowData[cell.dataset.inlinename] = cell.children[getFromChildren].selectedIndex;
// 				rowData["_"+cell.dataset.inlinename+"Title"] = JSON.parse(cell.dataset.inlineoptionstitle)[cell.children[getFromChildren].selectedIndex];
// 				rowData["_"+cell.dataset.inlinename+"Value"] = JSON.parse(cell.dataset.inlineoptionsvalue)[cell.children[getFromChildren].selectedIndex];
// 				inlineEditRowContents[rowName][i] = JSON.parse(cell.dataset.inlineoptionstitle)[cell.children[getFromChildren].selectedIndex];
// 				break;
// 			case "textarea":
// 				// TODO textarea value is \n not <br/>
// 				rowData[cell.dataset.inlinename] = cell.children[getFromChildren].value;
// 				inlineEditRowContents[rowName][i] = cell.children[getFromChildren].value;
// 				break;
// 			default:
// 				break;
// 		}
// 	}

// 	// do whatever ajax magic
// 	if (options.hasOwnProperty("finishCallback"))
// 		options.finishCallback(rowData, rowName);

// 	for (i=0; i<tableRow.childElementCount; i++) {
// 		var cell = tableRow.children[i];
// 		if (options.hasOwnProperty("finishCell")) {
// 			// return true invokes the default finishCell function
// 			if (options.finishCell(cell, i, rowName, inlineEditRowContents[rowName][i]) === true) {
// 				inlineDefaultFinishCell(cell, i, rowName);
// 			}
// 		} else
// 			inlineDefaultFinishCell(cell, i, rowName);
// 	}
// }

// function inlineDefaultFinishCell(cell, i, rowName) {
// 	var cellContent = "";
// 	cellContent += inlineEditRowContents[rowName][i];
// 	cell.innerHTML = cellContent;
// }