// Note this a server for testing:
// mysql isn't used (dbconf.json is useless) / later we will inlude it, with a db simple. The library was tested in a real project at Pepsi (main reason why created)

const express = require('express') ;
const path = require('path');
var app = express();

app.use(express.static(__dirname));
app.use(express.json());

app.get('/', function (req, res) {
    res.sendFile(path.resolve(__dirname, 'dataTableSample.html'));
});

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

app.get('/htmlTableEditing.js', function (req, res) {
    res.sendFile(path.join(__dirname, '../htmlTableEditing.js'));
});

app.get('/htmlTableEditing.css', function (req, res) {
    res.sendFile(path.join(__dirname, '../htmlTableEditing.css'));
});

app.portNumber = 4000;
function listen(port) {
    app.portNumber = port;
    app.listen(port, () => {
        console.log("server is running on port :" + app.portNumber);
    }).on('error', function (err) {
        if(err.errno === 'EADDRINUSE') {
            console.log(`----- Port ${port} is busy, trying with port ${port + 1} -----`);
            listen(port + 1)
        } else {
            console.log(err);
        }
    });
}

listen(app.portNumber);
