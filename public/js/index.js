$(document).ready(function () {
    let _lines = $("#page-markdown").text().split("\n");
    _text = ""
    for (i=0;i<_lines.length;i++) {
        _text += "\n" + _lines[i].trim();
    }
    while (_text.indexOf("{code}") > -1) {
        _text = _text.replace("{code}", "    ");
    }
    let md = window.markdownit().use(window.markdownitEmoji);
    let _html = md.render(_text)
    $("#page-markdown").text("");
    $("#page-markdown").html(_html);
});