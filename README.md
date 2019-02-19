# dharma-emailer

## Bem vindo ao Dharma Emailer. Seu servidor para envio de emails.

### Configurar servidor

Modelo do arquivo de configuração:


    {
        "host": "smtp.gmail.com",
        "port": 465,
        "ssl": true,
        "name": "Sr. Writer",
        "user": "usuario@gmail.com",
        "pass": "my_secret_pass"
    }

## Template do email

Basta criar, na pasta template, um arquivo html com formato da mensagem de email que você deseja enviar. Para informar campos
  para a formatação de dados, informar o nome do atributo entre **{<** e **>}**. Exemplo:

    &lt;center&gt;&lt;b style="color:#664411;font-weight:700;font-size:28px;"&gt;Welcome to Dharma Email&lt;/b&gt;&lt;/center&gt;&lt;br&gt;
    &lt;center&gt;&lt;b style="color:#22ff55;font-weight:700;font-size:28px;"&gt;Hello {&lt;nome&gt;}&lt;/b&gt;&lt;/center&gt;&lt;br&gt;
    &lt;center&gt;&lt;b style="color:#22ff55;font-weight:700;font-size:28px;"&gt;Your code is {&lt;codigo&gt;}&lt;/b&gt;&lt;/center&gt;&lt;br&gt;
    &lt;center&gt;&lt;b style="color:#ff2288;font-weight:700;font-size:28px;"&gt;Thanks for all the fish.&lt;/b&gt;&lt;/center&gt;&lt;br&gt;


## Enviar um email

Fazer um post para __/send__ no formato form-data e enviar, no corpo do post, no atributo __data__ um json informando o 
destinatário, assunto, template usado para renderizar o email e os dados usados na renderização:

    {
        "dest": "destinatario@gmail.com",
        "subject": "A Hello From Dharma Email",
        "template": "teste",
        "data": {
            "codigo": 333,
            "nome": "Sr. Ciclano"
        }
    }

Caso use o CURL, pode testar o envio usando o seguinte comando:

**curl -X POST -F "data=@config.json" -F "file1=@C:\Spool\upload.png" -F "file2=@C:\Spool\subheaven.jpg" "http://127.0.0.1:2560/send"**

No comando acima, __config.json__ é o nome do arquivo json com os dados para envio mostrado anteriormente, e ele está na mesma 
  pasta onde o __curl__ está sendo executado. upload.png e subheaven.jpg são os anexos que desejo enviar no email.
