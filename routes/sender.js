var Busboy = require('busboy');
const express = require('express');
const fs = require('fs');
const nodeMailer = require('nodemailer');
const router = express.Router();
const config = require('../config.json');
const path = require('path');
const uuid = require("uuid/v4");
var dharmaEmail = {};

dharmaEmail.transporter = null;

dharmaEmail.configSender = function() {
    dharmaEmail.transporter = nodeMailer.createTransport({
        host: config.host,
        //port: 995,
        port: config.port,
        ssl: config.secure,  //true for 465 port, false for other ports
        auth: {
            user: config.user,
            pass: config.pass
        }
    });
}
dharmaEmail.configSender();

dharmaEmail.processTemplate = function(template, data) {
    try {
        _tpath = path.resolve(__dirname, "..", "templates", template + ".html");
        var _text = fs.readFileSync(_tpath, 'utf8');
        _html = _text.toString();
        console.log(_html);
        for (_k in data) {
            _t = "{<" + _k + ">}";
            while (_html.indexOf(_t) > -1) {
                _html = _html.replace(_t, data[_k]);
            }
        }
        return _html;
    } catch(e) {
        console.log('Error:', e.stack);
        return "";
    }
}
/* GET home page. */
router.get('/', function (req, res, next) {
    res.send("<b>Como testar</b><br>curl -X POST -H \"Content-Type: application/json\" --data @teste.json http://127.0.0.1:2560/send")
});

dharmaEmail.mkDirByPathSync = function(targetDir, { isRelativeToScript = false } = {}) {
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

router.normalizeFilename = function(_str) {
    _notallowed = "áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇ";
    _allowed    = "aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcC";
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

dharmaEmail.sendEmailWithAttachment = function(res, _request, files) {
    _html = dharmaEmail.processTemplate(_request.template, _request.data);

    let mailOptions = {
        from: '"' + config.name + '" <' + config.user + '>', // sender address
        to: _request.dest, // list of receivers
        subject: _request.subject, // Subject line
        html: _html // html body
    };

    if (files.length > 0) {
        mailOptions["attachments"] = [];
        for (i=0;i<files.length;i++) {
            mailOptions["attachments"].push({
                path: files[i]
            });
        }
    }

    console.log(mailOptions);

    dharmaEmail.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.status(400).send({success: false})
        } else {
            console.log(info);
            res.status(200).send("That's all folks!");
        }
    });
    // res.writeHead(200, {
    //     'Connection': 'close'
    // });
    // res.end("That's all folks!");
}

dharmaEmail.prepareEmail = function(res, configname, files) {
    fs.readFile(configname, function(err, f){
        if (err != null) {
            console.log(err);
        }
        _str = f.toString();
        _config = JSON.parse(_str);
        console.log(_config);
        console.log(_config.dest);
        dharmaEmail.sendEmailWithAttachment(res, _config, files);
    });
    // _str = fs.readFileSync(_confpath, 'utf8');
    // console.log("|" + _str + "|");
    // _request = JSON.parse(_str);
    // console.log(_request);
}

router.post('/', function (req, res, next) {
    console.log("============================================================");
    _uuid = uuid();
    _configname = "";
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

        if (fieldname == "data") {
            _configname = _filepath;
        } else {
            _files.push(_filepath);
        }

        console.log("");
        console.log("Saving file to: " + _filepath);
        file.pipe(fs.createWriteStream(_filepath));
        file.on('data', function (data) {
            // console.log("busboy.on.file.on.data");
            // console.log("");
            // console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
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
        dharmaEmail.prepareEmail(res, _configname, _files);
    });
    req.pipe(busboy);
});

module.exports = router;