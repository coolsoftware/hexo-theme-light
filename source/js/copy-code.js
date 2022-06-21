(function() {
    let figure = document.querySelectorAll('figure.highlight');
    figure.forEach(element => {
        element.querySelectorAll('.code .line span').forEach(span => {
          span.classList.forEach(name => {
            span.classList.replace(name, `hljs-${name}`);
          });
        });
        element.insertAdjacentHTML('beforeend', '<div class="copy-btn"><i class="fa fa-copy fa-fw"></i></div>');
        const o = element.querySelector('.copy-btn');
        o.addEventListener("click", ()=> {
          var e = element.querySelector('.code').innerText;
          if (navigator.clipboard)
            navigator.clipboard.writeText(e).then(()=>{
                o.querySelector("i").className = "fa fa-check-circle fa-fw"
            }
            , ()=>{
                o.querySelector("i").className = "fa fa-times-circle fa-fw"
            }
            );
          else {
            const t = document.createElement("textarea");
            t.style.top = window.scrollY + "px",
            t.style.position = "absolute",
            t.style.opacity = "0",
            t.readOnly = !0,
            t.value = e,
            document.body.append(t),
            t.select(),
            t.setSelectionRange(0, e.length),
            t.readOnly = !1;
            e = document.execCommand("copy");
            o.querySelector("i").className = e ? "fa fa-check-circle fa-fw" : "fa fa-times-circle fa-fw",
            t.blur(),
            o.blur(),
            document.body.removeChild(t)
          }
        }
        ),
        element.addEventListener("mouseleave", ()=> {
          setTimeout(()=>{
              o.querySelector("i").className = "fa fa-copy fa-fw"
          }
          , 300)
        }
        )
    });
})();