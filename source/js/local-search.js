/* global CONFIG */

const CONFIG = {
    root             : '/',
    path             : 'search.json',
    localsearch      : {
        trigger           : 'auto',
        top_n_per_article : 1,
        unescape          : false,
        preload           : true,
        results_per_page  : 10
    }
};

window.addEventListener('DOMContentLoaded', () => {
  // Popup Window
  let isfetched = false;
  let datas;
  let isXml = true;
  // Search DB path
  let searchPath = CONFIG.path;
  if (searchPath.length === 0) {
    searchPath = 'search.xml';
  } else if (/json$/i.test(searchPath)) {
    isXml = false;
  }
  const path = CONFIG.root + searchPath;
  const input = document.getElementById('search-input');
  const resultContent = document.getElementById('search-result');
  const statsContainer = document.getElementById('search-stats-container');
  const statsContent = document.getElementById('search-stats');
  const pagesContainer = document.getElementById('search-pages-container');
  const pagesContent =  document.getElementById('search-pages');
  // results pagination
  let pages = [];
  // Ref: https://github.com/ForbesLindesay/unescape-html
  const unescapeHtml = html => {
    return String(html)
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .replace(/&#x3A;/g, ':')
      // Replace all the other &#x; chars
      .replace(/&#(\d+);/g, (m, p) => {
        return String.fromCharCode(p);
      })
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  };

  const getIndexByWord = (word, text, caseSensitive) => {
    let wordLen = word.length;
    if (wordLen === 0) return [];
    let startPosition = 0;
    let position = [];
    let index = [];
    if (!caseSensitive) {
      text = text.toLowerCase();
      word = word.toLowerCase();
    }
    while ((position = text.indexOf(word, startPosition)) > -1) {
      index.push({
        position: position,
        word    : word
      });
      startPosition = position + wordLen;
    }
    return index;
  };

  // Merge hits into slices
  const mergeIntoSlice = (start, end, index, searchText) => {
    let item = index[index.length - 1];
    let position = item.position;
    let word = item.word;
    let hits = [];
    let searchTextCountInSlice = 0;
    while (position + word.length <= end && index.length !== 0) {
      if (word === searchText) {
        searchTextCountInSlice++;
      }
      hits.push({
        position: position,
        length  : word.length
      });
      let wordEnd = position + word.length;

      // Move to next position of hit
      index.pop();
      while (index.length !== 0) {
        item = index[index.length - 1];
        position = item.position;
        word = item.word;
        if (wordEnd > position) {
          index.pop();
        } else {
          break;
        }
      }
    }
    return {
      hits           : hits,
      start          : start,
      end            : end,
      searchTextCount: searchTextCountInSlice
    };
  };

  // Highlight title and content
  const highlightKeyword = (text, slice) => {
    let result = '';
    let prevEnd = slice.start;
    slice.hits.forEach(hit => {
      result += text.substring(prevEnd, hit.position);
      let end = hit.position + hit.length;
      result += `<b class="search-keyword">${text.substring(hit.position, end)}</b>`;
      prevEnd = end;
    });
    result += text.substring(prevEnd, slice.end);
    return result;
  };

  const inputEventFunction = () => {
    let searchText = input.value.trim().toLowerCase();
    let keywords = searchText.split(/[-\s]+/);
    if (keywords.length > 1) {
      keywords.push(searchText);
    }
    pages = [];
    let resultItems = [];
    if (searchText.length > 0 && datas) {
      let page = 0;
      let page_items = 0;
      // Perform local searching
      datas.forEach(data => {
        // Only match articles with not empty titles
        if (!data.title) return;
        let searchTextCount = 0;
        let title = data.title.trim();
        let titleInLowerCase = title.toLowerCase();
        let content = data.content ? data.content.trim().replace(/<[^>]+>/g, '') : '';
        if (CONFIG.localsearch.unescape) {
          content = unescapeHtml(content);
        }
        let contentInLowerCase = content.toLowerCase();
        let articleUrl = decodeURIComponent(data.url).replace(/\/{2,}/g, '/');
        let indexOfTitle = [];
        let indexOfContent = [];
        keywords.forEach(keyword => {
          indexOfTitle = indexOfTitle.concat(getIndexByWord(keyword, titleInLowerCase, false));
          indexOfContent = indexOfContent.concat(getIndexByWord(keyword, contentInLowerCase, false));
        });

        // Show search results
        if (indexOfTitle.length > 0 || indexOfContent.length > 0) {
          let hitCount = indexOfTitle.length + indexOfContent.length;
          // Sort index by position of keyword
          [indexOfTitle, indexOfContent].forEach(index => {
            index.sort((itemLeft, itemRight) => {
              if (itemRight.position !== itemLeft.position) {
                return itemRight.position - itemLeft.position;
              }
              return itemLeft.word.length - itemRight.word.length;
            });
          });

          let slicesOfTitle = [];
          if (indexOfTitle.length !== 0) {
            let tmp = mergeIntoSlice(0, title.length, indexOfTitle, searchText);
            searchTextCount += tmp.searchTextCount;
            slicesOfTitle.push(tmp);
          }

          let slicesOfContent = [];
          while (indexOfContent.length !== 0) {
            let item = indexOfContent[indexOfContent.length - 1];
            let position = item.position;
            let word = item.word;
            // Cut out 100 characters
            let start = position - 20;
            let end = position + 80;
            if (start < 0) {
              start = 0;
            }
            if (end < position + word.length) {
              end = position + word.length;
            }
            if (end > content.length) {
              end = content.length;
            }
            let tmp = mergeIntoSlice(start, end, indexOfContent, searchText);
            searchTextCount += tmp.searchTextCount;
            slicesOfContent.push(tmp);
          }

          // Sort slices in content by search text's count and hits' count
          slicesOfContent.sort((sliceLeft, sliceRight) => {
            if (sliceLeft.searchTextCount !== sliceRight.searchTextCount) {
              return sliceRight.searchTextCount - sliceLeft.searchTextCount;
            } else if (sliceLeft.hits.length !== sliceRight.hits.length) {
              return sliceRight.hits.length - sliceLeft.hits.length;
            }
            return sliceLeft.start - sliceRight.start;
          });

          // Select top N slices in content
          let upperBound = parseInt(CONFIG.localsearch.top_n_per_article, 10);
          if (upperBound >= 0) {
            slicesOfContent = slicesOfContent.slice(0, upperBound);
          }

          let resultItem = '';

          if (slicesOfTitle.length !== 0) {
            resultItem += `<a href="${articleUrl}" class="search-result-title">${highlightKeyword(title, slicesOfTitle[0])}</a>`;
          } else {
            resultItem += `<a href="${articleUrl}" class="search-result-title">${title}</a>`;
          }

          slicesOfContent.forEach(slice => {
            resultItem += `<a href="${articleUrl}"><p class="search-result-body">${highlightKeyword(content, slice)}...</p></a>`;
          });

          resultItems.push({
            item           : resultItem,
            searchTextCount: searchTextCount,
            hitCount       : hitCount,
            id             : resultItems.length
          });
          
          if (page_items >= CONFIG.localsearch.results_per_page) {
            page++;
            page_items = 0;
          }
          if (page_items === 0) {
            const a = document.createElement('a');
            a.id = `search-page-${page}`;
            a.innerText = `${page+1}`;
            a.setAttribute('href', '#');
            a.className = 'search-page-link';
            a.onclick = (function() { const p = page; return function() {setActivePage(p);} })();
            if (page === 0) {
              a.style.fontWeight = "bold";
            }
            pages.push(a);
          }
          page_items++;
        }
      });
    }
    if (keywords.length === 1 && keywords[0] === '') {
      statsContainer.style.visibility = 'hidden';
      statsContent.innerHTML = '';
      pagesContainer.style.visibility = 'hidden';
      pagesContent.innerHTML = '';
      resultContent.innerHTML = '<div id="no-result"></div>';
    } else {
      statsContent.innerHTML = resultItems.length;
      statsContainer.style.visibility = 'visible';
      if (resultItems.length === 0) {
        pagesContainer.style.visibility = 'hidden';
        pagesContent.innerHTML = '';
        resultContent.innerHTML = '<div id="no-result"></div>';
      } else {
        pagesContent.innerHTML = '';
        pages.forEach(page => {
          pagesContent.appendChild(page);
        });
        pagesContainer.style.visibility = 'visible';
        resultItems.sort((resultLeft, resultRight) => {
          if (resultLeft.searchTextCount !== resultRight.searchTextCount) {
            return resultRight.searchTextCount - resultLeft.searchTextCount;
          } else if (resultLeft.hitCount !== resultRight.hitCount) {
            return resultRight.hitCount - resultLeft.hitCount;
          }
          return resultRight.id - resultLeft.id;
        });
        let searchResultList = '<div class="search-result-list">';
        let page = 0;
        let page_items = 0;
        resultItems.forEach(result => {
          if (page_items >= CONFIG.localsearch.results_per_page) {
            page++;
            page_items = 0;
          }
          if (page === 0) {
            searchResultList += `<div class="search-result-item search-result-page${page}">` + result.item + '</div>';
          } else {
            searchResultList += `<div class="search-result-item search-result-page${page}" style="display: none">` + result.item + '</div>';
          }
          page_items++;
        });
        searchResultList += '</div>';
        resultContent.innerHTML = searchResultList;
      }
    }
  };

  const fetchData = callback => {
    fetch(path)
      .then(response => response.text())
      .then(res => {
        // Get the contents from search data
        isfetched = true;
        datas = isXml ? [...new DOMParser().parseFromString(res, 'text/xml').querySelectorAll('entry')].map(element => {
          return {
            title  : element.querySelector('title').innerHTML,
            content: element.querySelector('content').innerHTML,
            url    : element.querySelector('url').innerHTML
          };
        }) : JSON.parse(res);
        if (callback) {
          callback();
        }
      });
  };

  const queryString = (new URLSearchParams(window.location.search)).get('q');
  if (queryString) {
    input.value = queryString;
  }

  if (CONFIG.localsearch.preload || queryString) {
    fetchData(() => {
      document.getElementById('search-input').focus();
      inputEventFunction();
    });
  }

  const proceedSearch = () => {
    document.getElementById('search-input').focus();
  };

  // Search function
  const searchFunc = () => {
    fetchData(proceedSearch);
  };

  if (CONFIG.localsearch.trigger === 'auto') {
    input.addEventListener('input', inputEventFunction);
  } else {
    input.addEventListener('keypress', event => {
      if (event.keyCode === 13) {
        inputEventFunction();
      }
    });
  }

  document.querySelector('.search-icon').addEventListener('click', inputEventFunction);

  const setActivePage = (page) => {
    for (let i = 0; i < pages.length; i++) {
      if (i === page) {
        pages[i].style.fontWeight = "bold";
      } 
      else {
        pages[i].style.fontWeight = "normal";
      }
      for (const element of document.getElementsByClassName(`search-result-page${i}`)) {
        if (i === page) {
          element.style.display = 'block';
        }
        else {
          element.style.display = 'none';
        }
      }
    }
    return false; //prevent default href
  }
});