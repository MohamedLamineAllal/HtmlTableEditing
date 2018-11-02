# HtmlTableEditing

A library that make any html table editable, wiht built in ajax capability, riche api, and helpers, error handling, flexible undo capability and more. Built for a need to use it with Datatable.js library. But it work in all situation for any html table.

You find in demo folder, a demo, you can try it. 

To test, clone the repo and then install the the dependencies:
```
npm install

```

once done you can go to demo, and 
```
node server

```
to start the server.



Here an example that show how you use the library (later we will document the library better)

```html
<script src="DataTables/datatables.min.js"></script>

<script src="/htmlTableEditing.js"></script>
<script>
    $(document).ready(function () {
        $('#testTable').DataTable();

        //testing
        let tableDOM = document.getElementById('testTable');
        let editor = new HtmlTableEditing(tableDOM, {
            columnsNames: [
                'productTYPE',
                'JAN',
                'FEV',
                'MAR',
                'AVR'
            ]
        });

        // on cell update we, you get in the callback, what cell, the new and last value, you can use that to send a call to the backend, in the way you want. Here an example. Yout treat that on the backend, and you send back a response, then you handle that, you send back a response, that express if the operation succeeded or not, and following that if it's a success you don't do a thing, the cell is already updated, otherwise you trigger an edit undo  with editor.undoAfterFailedSave() and trigger error popup if you want (one that come with this package or handle it yourself) with  editor.editUpdateError() [look up the whole example it's clear]
        editor.on('editCellUpdate', function (cell, newVal, lastVal) {
            let json = {
                type: 'cellUpdate',
                column: {
                    index: cell.columnHeader.index,
                    name: cell.columnHeader.name,
                    innerHTML: cell.columnHeader.innerHTML
                },
                row: {
                    innerHTML: editor.getRowHeader(cell.parentNode).innerHTML,
                    index: editor.getRowIndex(cell.parentNode)
                },
                cell: {
                    oldValue: lastVal,
                    newValue: newVal
                }
            };
            console.log("json obj");
            console.dir(json);
            console.log("json sent: ");
            console.log(JSON.stringify(json));

            editor.ajax({
                url: '/api/editing',
                data: json,
                method: 'POST', // even though it's the default value (i could have omited it) (j'aurai pu ne pas la mettre)
                type: 'application/json', // same thing the default is json i could have omited it
                responseType: 'json',
                success: function (xhr, response) {
                    if (!response.hasOwnProperty('error')) { // case there is no error! (our own error like in logic ..etc) || it's formated in the server side
                        alert('save success');
                        alert(JSON.stringify(response));
                        // we can not do a thing, also we can show a message (an info alert)
                        // you can still implement a function or an object to add undo functionality (you pass to it the cell, and last value) then you can use undoAfterFailedSave() // we will create anothe alias for no name mislead. and you need to send to your server where you should have implemented undo functionality.
                    } else { // case error (logic error)
                        //alert('error: ' + response.error.msg);
                        editor.undoAfterFailedSave(cell, lastVal); // undo the edit

                        editor.editUpdateError(cell,
                            'Save failed : ' + response.error.msg); // show error popup (come with the lib) [ for style you can overide the css]
                    }
                },
                error: function (xhr, status) { // http error
                    let errorMessage = editor.ajax_errorTextFromStatus(status);
                    //this.alert(errorMessage);

                    editor.undoAfterFailedSave(cell, lastVal);

                    editor.editUpdateError(cell, 'Save failed due to this error: ' +
                        errorMessage);
                }

            })
        });

        // listen to table cells [by delegation]
        tableDOM.addEventListener("click", function (evt) {
            let target = evt.target;

            let cell = isWithinAnElOfTagType_get(target, 'td', tableDOM); // getting the cell

            if (cell) {
                editor.editCell(cell); // editing the cell
            }
        });
    });
</script>
```

Server side example (here node with express) [only relevent function]:
```javascript
app.post('/api/editing', function (req, res) {
    console.log("req :");
    console.dir(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(
        {//error simulation
            error: {
                msg: 'In purpose error (we are testing hahaaaahahahahaa)',
                code: 888
            },
            type: 'failedCellUpdate',
            oldValue: req.body.cell.oldValue //when the editing send ajax request,
        },
        // {// no error entry it's success (that is your own logic, no neccessary should be that, you are fluid to do whatever you want, you are setting the ajax request, and responding to it, this lib is only providing helpers, and the editing is happening automatically and intuitivly)
        //     type: 'success',
        //     msg: "Cell edited with success"
        // }
    ));
});

```

Those snippet are from the demo, you can check the demo, and test it.




Note The library do the job, but still not all mature yet, it's just the begining. 

Issues to be fixed:
error Popup, bad positionning (recheck the positioning logic).

No other known issues all work nice.

A lot of feature to be added, and things to be implemented!

different editing mode,
enriche the api, and configurability
....



You want to contribute, contact me at allaldevelopment@gmail.com

feedback Also well welcomed.