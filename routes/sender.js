var Busboy = require('busboy');
const express = require('express');
const fs = require('fs');
const nodeMailer = require('nodemailer');
const router = express.Router();
// const config = require('../config.json');
const path = require('path');
const uuid = require("uuid/v4");
const Imap = require("imap");
const mimemessage = require("mimemessage");


var dharmaEmail = {};

dharmaEmail.transporter = null;

dharmaEmail.configSender = function (config) {
    dharmaEmail.transporter = nodeMailer.createTransport({
        host: config.host,
        port: config.port,
        ssl: config.secure, //true for 465 port, false for other ports
        auth: {
            user: config.user,
            pass: config.pass
        },
    });
}
// dharmaEmail.configSender();

dharmaEmail.processTemplate = function (template, data) {
    try {
        _tpath = path.resolve(__dirname, "..", "templates", template + ".html");
        var _text = fs.readFileSync(_tpath, 'utf8');
        _html = _text.toString();
        for (_k in data) {
            _t = "{<" + _k + ">}";
            while (_html.indexOf(_t) > -1) {
                _html = _html.replace(_t, data[_k]);
            }
        }
        return _html;
    } catch (e) {
        console.log('Error:', e.stack);
        return "";
    }
}
/* GET home page. */
router.get('/', function (req, res, next) {
    res.send("<b>Como testar</b><br>curl -X POST -H \"Content-Type: application/json\" --data @teste.json http://127.0.0.1:2560/send")
});

dharmaEmail.mkDirByPathSync = function (targetDir, {
    isRelativeToScript = false
} = {}) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';

    return targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            fs.mkdirSync(curDir);
        } catch (err) {
            if (err.code === 'EEXIST') { // curDir already exists!
                return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
                throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
            }

            const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
            if (!caughtErr || caughtErr && targetDir === curDir) {
                throw err; // Throw if it's just the last created dir.
            }
        }

        return curDir;
    }, initDir);
}

dharmaEmail.checkPath = function (pathname) {
    if (!fs.existsSync(pathname)) {
        console.log("");
        console.log("Creating folder " + pathname);
        dharmaEmail.mkDirByPathSync(pathname);
    }
}

router.normalizeFilename = function (_str) {
    _notallowed = "áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇ";
    _allowed = "aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcC";
    result = "";
    for (var i = 0; i < _str.length; i++) {
        let _ai = _notallowed.indexOf(_str.charAt(i));
        if (_ai > -1) {
            result += _allowed.charAt(_ai);
        } else {
            result += _str.charAt(i);
        }
    }
    return result;
}

dharmaEmail.sendEmailWithAttachment = function (res, _request, files, html = "") {
    _html = "";
    if (html == "") {
        _html = dharmaEmail.processTemplate(_request.template, _request.data);
    } else {
        try {
            let _df = fs.readFileSync(html, 'utf8');
            _html = _df.toString();
            console.log("Uploaded HTML:");
            // console.log(_html);
        } catch (e) {
            console.log('Error:', e.stack);
        }
    }

    let config;
    console.log(`REQUEST EMITENTE ${_request.emitente}`);
    if (_request.emitente == "iacon" || _request.emitente == "processos") {
        config = require(`../config_${_request.emitente}.json`);
    } else {
        config = require('../config.json');
    }
    console.log(config)
    dharmaEmail.configSender(config);

    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log(JSON.stringify(_request, null, 4))
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++");
    let mailOptions = {
        from: '"' + config.name + '" <' + config.user + '>', // sender address
        to: _request.dest, // list of receivers
        subject: _request.subject, // Subject line
        html: _html, // html body
        // dsn: {
        //     id: 'delivery_status_notification',
        //     return: 'headers',
        //     notify: ['success', 'failure', 'delay'],
        //     recipient: ""
        // }
    };

    if ("cc" in _request) {
        mailOptions["cc"] = _request.cc
    }

    if (files.length > 0) {
        mailOptions["attachments"] = [];
        for (i = 0; i < files.length; i++) {
            mailOptions["attachments"].push({
                filename: path.basename(files[i]),
                path: files[i]
            });
        }
    }

    //console.log(mailOptions);

    dharmaEmail.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("---> DEU ERRO <---")
            console.log(error);
            res.status(400).send({
                success: false
            })
        } else {
            if (config.host.indexOf('gmail') == -1) {
                console.log("CRIANDO NEW IMAP CONNECTION");
                let imap = new Imap({
                    user: config.user,
                    password: config.pass,
                    host: config.imap,
                    port: 993,
                    tls: true
                });
                
                console.log("GOING TO READY STATE");
                imap.once('ready', function () {
                    console.log("OPENING BOX");
                    imap.openBox('Itens Enviados', false, (err, box) => {
                        if (err) throw err;
    
                        const currentDate = new Date();
    
                        console.log("--> MOVING E-MAIL TO SENT FOLDER")
                        let msg, htmlEntity, plainEntity;
                        msg = mimemessage.factory({
                            contentType: 'multipart/alternate',
                            body: []
                        });
                        htmlEntity = mimemessage.factory({
                            contentType: 'text/html;charset=utf-8',
                            body: mailOptions.html
                        });
                        // plainEntity = mimemessage.factory({
                        //     body: mailOptions.text
                        // });
                        msg.header('Message-ID', info.messageId);
                        msg.header('From', mailOptions.from);
                        msg.header('To', mailOptions.to);
                        msg.header('Subject', mailOptions.subject);
                        msg.header('Date', currentDate);
                        msg.body.push(htmlEntity);
                        // msg.body.push(plainEntity);
    
                        imap.append(msg.toString());
    
                        console.log("<-- MOVED E-MAIL TO SENT FOLDER")
                    });
                });
                imap.once('error', function(err) {
                    console.log(`ERROR ==> ${err}`);
                });
    
                imap.once('end', function() {
                    console.log('CONNECTION ENDED');
                });
    
                console.log("CONNECTING...")
                imap.connect();
                console.log("CONNECTED")
            }

            console.log(`INFO:`);
            console.log(info);
            res.status(200).send("That's all folks!");
        }
    });
}

dharmaEmail.prepareEmail = function (res, configname, files, html = "") {
    fs.readFile(configname, function (err, f) {
        if (err != null) {
            console.log(err);
        }
        _str = f.toString();
        _config = JSON.parse(_str);
        dharmaEmail.sendEmailWithAttachment(res, _config, files, html = html);
    });
}

router.post('/', function (req, res, next) {
    console.log("============================================================");
    _uuid = uuid();
    _configname = "";
    _htmlname = "";
    _files = [];
    let _temppath = path.join(__dirname, "..", "temp", _uuid);
    dharmaEmail.checkPath(_temppath);
    console.log("Recebendo Upload code " + _uuid);
    var _filename = "";
    var busboy = new Busboy({
        headers: req.headers
    });
    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
        console.log("busboy.on.file");
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
        //let _filepath = path.join(config["waitingroom"], path.basename(fieldname));
        let _filename = router.normalizeFilename(filename);

        let _filepath = path.join(_temppath, _filename);

        console.log(fieldname)
        if (fieldname == "data") {
            _configname = _filepath;
        } else if (fieldname == "html") {
            _htmlname = _filepath;
        } else {
            _files.push(_filepath);
        }

        console.log("");
        console.log("Saving file to: " + _filepath);
        file.pipe(fs.createWriteStream(_filepath));
        file.on('data', function (data) {
            console.log("busboy.on.file.on.data");
            console.log("");
            console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
        });
        file.on('end', function () {
            console.log("busboy.on.file.on.end");
            console.log("");
            console.log('File [' + fieldname + '] Finished');
        });
    });
    busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        console.log("busboy.on.field");
        console.log('fieldnameTruncated - ' + fieldnameTruncated);
        console.log('valTruncated - ' + valTruncated);
        console.log('encoding - ' + encoding);
        console.log('mimetype - ' + mimetype);
        console.log('Field [' + fieldname + ']: value: ' + inspect(val));
    });
    busboy.on('finish', function () {
        console.log("busboy.on.finish");
        console.log('Upload finalizado!');
        console.log("============================================================");
        console.log("html path:")
        console.log("    " + _htmlname);
        dharmaEmail.prepareEmail(res, _configname, _files, html = _htmlname);
    });
    req.pipe(busboy);
});

module.exports = router;