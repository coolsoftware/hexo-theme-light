(function() {
    let figure = document.querySelectorAll('figure.highlight');
    figure.forEach(element => {
        element.querySelectorAll('.code .line span').forEach(span => {
          span.classList.forEach(name => {
            span.classList.replace(name, `hljs-${name}`);
          });
        });
        element.parentElement.insertAdjacentHTML('beforeend', '<div class="copy-btn"><i class="fa fa-copy fa-fw"></i>!!!</div>');
    });
})();