const express = require('express');
const fs = require('fs');
const nodeMailer = require('nodemailer');
const router = express.Router();
const config = require('../config.json');
const path = require('path');
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
        console.log(_tpath)
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

router.post('/', function (req, res, next) {
    
    console.log(req.body);
    /**
     * Exemplo de objeto de requisição de envio de email
     */
    _request = {
        dest: "subheaven.paulo@gmail.com",
        subject: "A Hello From Dharma Email",
        template: "teste",
        data: {
            codigo: 333,
            nome: "SubHeaven",
            valor: 745.29
        }
    }

    _request = req.body;

    _html = dharmaEmail.processTemplate(_request.template, _request.data);
    console.log(_html);

    let mailOptions = {
        from: '"' + config.name + '" <' + config.user + '>', // sender address
        to: _request.dest, // list of receivers
        subject: _request.subject, // Subject line
        html: _html // html body
    };


    dharmaEmail.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.status(400).send({success: false})
        } else {
            console.log(info);
            res.status(200).send({success: true});
        }
    });
    res.status(200).send("Oi");
});

module.exports = router;