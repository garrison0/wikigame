(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
ctx.font = '12px serif';

var x = canvas.width/2;
var y = canvas.height/2;
var x2 = canvas.width/2;
var y2 = canvas.height/2;

var t = 5;
var str = "";
var myImg = new Image(100,200);
var html;
var change = false;
var translated_text = "";
var n;
var res;
var data;
var r = 0.99;
var synonyms;

var ed = require('edit-distance');
var randomWords = require('random-words');
// myImg.onload = function() {
//  ctx.drawImage(myImg, 0, 0);
// };

function editDistance(strA, strB){
  // Define cost functions.
  var insert, remove, update;
  insert = remove = function(node) { return 1; };
  update = function(stringA, stringB) { return stringA !== stringB ? 1 : 0; };
   
  // Compute edit distance, mapping, and alignment.
  var lev = ed.levenshtein(strA, strB, insert, remove, update);
  return lev.distance;
}

function getWord(){
  let word = "";
  while (word.length <= 3) {
    word = randomWords();
  }
  return word;
}

async function getRandomArticle() {
  // for testing sanity, just switch the endpoint to this:
  //const endpoint = "https://en.wikipedia.org/api/rest_v1/page/mobile-sections/blue";
  try {
    let endpoint;
    if(Math.random() < r){
      let word = getWord();
      endpoint = "https://en.wikipedia.org/api/rest_v1/page/mobile-sections/"
      endpoint = endpoint + word;
      endpoint = endpoint + "?redirect=true";
    } else { 
      endpoint = "https://en.wikipedia.org/api/rest_v1/page/random/mobile-sections";
    }

    const response = await fetch(endpoint);
    data = await response.json();
    const passed = await filter(data, response);
    if (!passed) await getRandomArticle();
    str = data;
    
    html = str.lead.sections[0].text;
    html = html.replace(new RegExp(str.lead.normalizedtitle, 'i'), "CENSORED");
    var div = document.createElement("div");
    div.innerHTML = html;
    var text = div.textContent || div.innerText || "";
    
    res = text.split(".");
    //html = (str.remaining.sections[Math.max(0,Math.floor(Math.random()*str.remaining.sections.length - 1))]).text;
    change = true;

    if(str.lead.normalizedtitle.split(" ").length == 1){
      synonyms = await findSynonyms(str.lead.normalizedtitle);
      synonyms.push(str.lead.normalizedtitle);
    } else {
      synonyms = [str.lead.normalizedtitle];
    }

  } catch (error) {
    console.log(error);
  }
}

const input = document.querySelector('input');
input.addEventListener('keyup', function onEvent(e) { 
  if (e.key === "Enter") {
    // check game logic (guess vs. answer -> transition)
    let ns = synonyms.map(word => Math.max(word.length / 3, 1));
    let ks = synonyms.map(word => editDistance(word.toLowerCase(), input.value.toLowerCase()));

    for (var i = 0; i < ns.length; i++){
      if (ks[i] <= ns[i]) {
        //console.log("nice!");
        getRandomArticle();
        break;
      }
    }

    speechSynthesis.speak(new SpeechSynthesisUtterance('What a terrible guess.'));
    input.value = "";
  }
});

async function findSynonyms(word){
  let endpoint = "https://api.datamuse.com/words?ml=";
  endpoint = endpoint + word;

  let response = await fetch(endpoint);
  let data = await response.json();

  // make plain array of synonyms from json
  var res = data.map(elem => elem.word);
  return res;
}


async function filter(data, response){
  //console.log(data.lead.sections[0].text.includes("infobox"));
  if (response.status == 404) {
    return false;
  }
  let title = data.lead.normalizedtitle;
  return !data.lead.disambiguation 
      && data.lead.sections[0].text.includes("infobox")
      && (title.split(" ").length <= 2)
      && !(title.includes('(') || title.includes(')')); 
}

async function translate(text, lang){
  // lang : string (ex: 'en-ru')
  const key = 'trnsl.1.1.20190728T002925Z.a6ed32bedce2d146.600adea4f41cf3dca7016feced65fe2d48e1bda6';
  let endpoint = "https://translate.yandex.net/api/v1.5/tr.json/translate";
  endpoint += "?key=";
  endpoint += key;
  endpoint += "&text=";
  endpoint += text;
  endpoint += "&lang=";
  endpoint += lang;

  let response = await fetch(endpoint);
  let data = await response.json();
  return data;
}

function paraphrase(text){
  translate(text, "en-ru").then(data =>
    translate(data.text[0], "ru-en").then(ans =>
      translated_text = ans.text[0]));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  //ctx.arc(x, y, 10, 0, Math.PI*2);
  //ctx.arc(x2, y2, 10, 0, Math.PI*2);
  ctx.fillStyle = "#0095DD";
  console.log(str.lead.normalizedtitle);
  //ctx.fillText(str.lead.normalizedtitle, 10, 25);
  ctx.fillText(str.lead.description, 10, 50);

  // hint/paraphrasing section
  if(change) {
    n = Math.floor(Math.random() * res.length);
    paraphrase(res[n]);
    change = !change; 
  } 

  ctx.fillText(translated_text, 10, 75);

  let obj = str.lead.image.urls;
  res = Object.keys(obj).map(key => obj[key]);
  myImg.src = res[0];

  ctx.drawImage(myImg,100,100);
  ctx.fill();
  ctx.closePath();

  x = (canvas.height/1.5) + 100 * Math.sin(3 * t + Math.PI / 4);
  y = (canvas.width/3) + 75 * Math.sin(5 * t);
  x2 = (canvas.height/1.5) + 100 * Math.sin(3 * (t - 0.1) + Math.PI / 4);
  y2 = (canvas.width/3) + 75 * Math.sin(5 * (t - 0.1));

  t += 0.01;
}

getRandomArticle();
setInterval(draw, 10);
},{"edit-distance":2,"random-words":6}],2:[function(require,module,exports){
module.exports = {
  ted: require('./ted'),
  levenshtein: require('./levenshtein')
};

},{"./levenshtein":3,"./ted":4}],3:[function(require,module,exports){
var Mapping, levenshtein, levenshteinBt, ref, trackedMin, zero;

ref = require('./util'), Mapping = ref.Mapping, zero = ref.zero, trackedMin = ref.trackedMin;

levenshtein = function(stringA, stringB, insertCb, removeCb, updateCb) {
  var a, aC, b, bC, dist, distance, i, j, k, l, m, min, n, ref1, ref2, ref3, ref4, track;
  a = stringA;
  b = stringB;
  track = zero(a.length + 1, b.length + 1);
  dist = zero(a.length + 1, b.length + 1);
  for (i = k = 1, ref1 = a.length; k <= ref1; i = k += 1) {
    dist[i][0] = i;
  }
  for (j = l = 1, ref2 = b.length; l <= ref2; j = l += 1) {
    dist[0][j] = j;
  }
  for (i = m = 1, ref3 = a.length; m <= ref3; i = m += 1) {
    for (j = n = 1, ref4 = b.length; n <= ref4; j = n += 1) {
      aC = a.charAt(i - 1);
      bC = b.charAt(j - 1);
      min = trackedMin(dist[i - 1][j] + removeCb(aC), dist[i][j - 1] + insertCb(bC), dist[i - 1][j - 1] + updateCb(aC, bC));
      track[i][j] = min.index;
      dist[i][j] = min.value;
    }
  }
  distance = dist[a.length][b.length];
  return new Mapping(a, b, distance, track, levenshteinBt);
};

levenshteinBt = function(a, b, track) {
  var i, j, mapping;
  i = a.length;
  j = b.length;
  mapping = [];
  while (i > 0 && j > 0) {
    switch (track[i][j]) {
      case 0:
        mapping.push([a[i - 1], null]);
        --i;
        break;
      case 1:
        mapping.push([null, b[j - 1]]);
        --j;
        break;
      case 2:
        mapping.push([a[i - 1], b[j - 1]]);
        --i;
        --j;
        break;
      default:
        throw new Error("Invalid operation " + track[i][j] + " at (" + i + ", " + j + ")");
    }
  }
  if (i === 0 && j !== 0) {
    while (j > 0) {
      mapping.push([null, b[j - 1]]);
      --j;
    }
  }
  if (i !== 0 && j === 0) {
    while (i > 0) {
      mapping.push([a[i - 1], null]);
      --i;
    }
  }
  return mapping;
};

module.exports = levenshtein;

},{"./util":5}],4:[function(require,module,exports){
var Mapping, postOrderWalk, ref, ted, tedBt, trackedMin, zero;

ref = require('./util'), Mapping = ref.Mapping, zero = ref.zero, trackedMin = ref.trackedMin;

postOrderWalk = function(root, childrenCb, visitCb) {
  var child, children, firstChild, index, k, len, node, ref1, ref2, ref3, ref4, stack1, stack2;
  stack1 = [];
  stack2 = [];
  stack1.push([void 0, root]);
  while (stack1.length > 0) {
    ref1 = stack1.pop(), index = ref1[0], node = ref1[1];
    children = childrenCb(node);
    firstChild = (ref2 = children != null ? children[0] : void 0) != null ? ref2 : null;
    stack2.push([index, node, firstChild]);
    ref3 = children != null ? children : [];
    for (index = k = 0, len = ref3.length; k < len; index = ++k) {
      child = ref3[index];
      stack1.push([index, child]);
    }
  }
  while (stack2.length > 0) {
    ref4 = stack2.pop(), index = ref4[0], node = ref4[1], firstChild = ref4[2];
    visitCb(index, node, firstChild);
  }
};

ted = function(rootA, rootB, childrenCb, insertCb, removeCb, updateCb) {
  var fdist, i, j, k, l, len, len1, preprocess, ref1, ref2, tA, tB, tdist, tdistance, treeDistance, ttrack;
  preprocess = function(root) {
    var t;
    t = {
      nodes: [],
      llds: [],
      keyroots: []
    };
    postOrderWalk(root, childrenCb, function(index, node, firstChild) {
      var childIndex, lldIndex, nIndex;
      nIndex = t.nodes.length;
      t.nodes.push(node);
      if (firstChild == null) {
        lldIndex = nIndex;
      } else {
        childIndex = t.nodes.indexOf(firstChild);
        lldIndex = t.llds[childIndex];
      }
      t.llds.push(lldIndex);
      if (index !== 0) {
        t.keyroots.push(nIndex);
      }
    });
    return t;
  };
  treeDistance = function(i, j) {
    var a, aL, aN, b, bL, bN, iOff, jOff, k, l, m, min, n, o, p, q, r, ref1, ref2, ref3, ref4;
    aL = tA.llds;
    bL = tB.llds;
    aN = tA.nodes;
    bN = tB.nodes;
    iOff = aL[i] - 1;
    jOff = bL[j] - 1;
    m = i - aL[i] + 2;
    n = j - bL[j] + 2;
    for (a = k = 1, ref1 = m; k < ref1; a = k += 1) {
      fdist[a][0] = fdist[a - 1][0] + removeCb(aN[a + iOff]);
    }
    for (b = l = 1, ref2 = n; l < ref2; b = l += 1) {
      fdist[0][b] = fdist[0][b - 1] + insertCb(bN[b + jOff]);
    }
    for (a = o = 1, ref3 = m; o < ref3; a = o += 1) {
      for (b = r = 1, ref4 = n; r < ref4; b = r += 1) {
        if (aL[i] === aL[a + iOff] && bL[j] === bL[b + jOff]) {
          min = trackedMin(fdist[a - 1][b] + removeCb(aN[a + iOff]), fdist[a][b - 1] + insertCb(bN[b + jOff]), fdist[a - 1][b - 1] + updateCb(aN[a + iOff], bN[b + jOff]));
          ttrack[a + iOff][b + jOff] = min.index;
          tdist[a + iOff][b + jOff] = fdist[a][b] = min.value;
        } else {
          p = aL[a + iOff] - 1 - iOff;
          q = bL[b + jOff] - 1 - jOff;
          fdist[a][b] = Math.min(fdist[a - 1][b] + removeCb(aN[a + iOff]), fdist[a][b - 1] + insertCb(bN[b + jOff]), fdist[p][q] + tdist[a + iOff][b + jOff]);
        }
      }
    }
  };
  tA = preprocess(rootA);
  tB = preprocess(rootB);
  ttrack = zero(tA.nodes.length, tB.nodes.length);
  tdist = zero(tA.nodes.length, tB.nodes.length);
  fdist = zero(tA.nodes.length + 1, tB.nodes.length + 1);
  ref1 = tA.keyroots;
  for (k = 0, len = ref1.length; k < len; k++) {
    i = ref1[k];
    ref2 = tB.keyroots;
    for (l = 0, len1 = ref2.length; l < len1; l++) {
      j = ref2[l];
      treeDistance(i, j);
    }
  }
  tdistance = tdist[tA.nodes.length - 1][tB.nodes.length - 1];
  return new Mapping(tA, tB, tdistance, ttrack, tedBt);
};

tedBt = function(tA, tB, ttrack) {
  var i, j, mapping;
  mapping = [];
  i = tA.nodes.length - 1;
  j = tB.nodes.length - 1;
  while (i >= 0 && j >= 0) {
    switch (ttrack[i][j]) {
      case 0:
        mapping.push([tA.nodes[i], null]);
        --i;
        break;
      case 1:
        mapping.push([null, tB.nodes[j]]);
        --j;
        break;
      case 2:
        mapping.push([tA.nodes[i], tB.nodes[j]]);
        --i;
        --j;
        break;
      default:
        throw new Error("Invalid operation " + ttrack[i][j] + " at (" + i + ", " + j + ")");
    }
  }
  if (i === -1 && j !== -1) {
    while (j >= 0) {
      mapping.push([null, tB.nodes[j]]);
      --j;
    }
  }
  if (i !== -1 && j === -1) {
    while (i >= 0) {
      mapping.push([tA.nodes[i], null]);
      --i;
    }
  }
  return mapping;
};

module.exports = ted;

},{"./util":5}],5:[function(require,module,exports){
var Mapping,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

module.exports.Mapping = Mapping = (function() {
  function Mapping(a1, b1, distance, track, backtrackFn) {
    this.a = a1;
    this.b = b1;
    this.distance = distance;
    this.track = track;
    this.backtrackFn = backtrackFn;
    this.alignment = bind(this.alignment, this);
    this.pairs = bind(this.pairs, this);
    this.pairCache = null;
  }

  Mapping.prototype.pairs = function() {
    if (this.pairCache == null) {
      this.pairCache = this.backtrackFn(this.a, this.b, this.track);
    }
    return this.pairCache;
  };

  Mapping.prototype.alignment = function() {
    var alignmentA, alignmentB, k, len, pair, pairs, ref;
    pairs = this.pairs();
    alignmentA = [];
    alignmentB = [];
    ref = pairs.reverse();
    for (k = 0, len = ref.length; k < len; k++) {
      pair = ref[k];
      alignmentA.push(pair[0]);
      alignmentB.push(pair[1]);
    }
    return {
      alignmentA: alignmentA,
      alignmentB: alignmentB
    };
  };

  return Mapping;

})();

module.exports.zero = function(width, height) {
  var i, j, k, l, ref, ref1, x, y;
  x = new Array(width);
  for (i = k = 0, ref = width; k < ref; i = k += 1) {
    y = x[i] = new Array(height);
    for (j = l = 0, ref1 = height; l < ref1; j = l += 1) {
      y[j] = 0;
    }
  }
  return x;
};

module.exports.trackedMin = function(a, b, c) {
  var min;
  min = {
    value: a,
    index: 0 | 0
  };
  if (b < min.value) {
    min.value = b;
    min.index = 1 | 0;
  }
  if (c < min.value) {
    min.value = c;
    min.index = 2 | 0;
  }
  return min;
};

},{}],6:[function(require,module,exports){
var wordList = [
  // Borrowed from xkcd password generator which borrowed it from wherever
  "ability","able","aboard","about","above","accept","accident","according",
  "account","accurate","acres","across","act","action","active","activity",
  "actual","actually","add","addition","additional","adjective","adult","adventure",
  "advice","affect","afraid","after","afternoon","again","against","age",
  "ago","agree","ahead","aid","air","airplane","alike","alive",
  "all","allow","almost","alone","along","aloud","alphabet","already",
  "also","although","am","among","amount","ancient","angle","angry",
  "animal","announced","another","answer","ants","any","anybody","anyone",
  "anything","anyway","anywhere","apart","apartment","appearance","apple","applied",
  "appropriate","are","area","arm","army","around","arrange","arrangement",
  "arrive","arrow","art","article","as","aside","ask","asleep",
  "at","ate","atmosphere","atom","atomic","attached","attack","attempt",
  "attention","audience","author","automobile","available","average","avoid","aware",
  "away","baby","back","bad","badly","bag","balance","ball",
  "balloon","band","bank","bar","bare","bark","barn","base",
  "baseball","basic","basis","basket","bat","battle","be","bean",
  "bear","beat","beautiful","beauty","became","because","become","becoming",
  "bee","been","before","began","beginning","begun","behavior","behind",
  "being","believed","bell","belong","below","belt","bend","beneath",
  "bent","beside","best","bet","better","between","beyond","bicycle",
  "bigger","biggest","bill","birds","birth","birthday","bit","bite",
  "black","blank","blanket","blew","blind","block","blood","blow",
  "blue","board","boat","body","bone","book","border","born",
  "both","bottle","bottom","bound","bow","bowl","box","boy",
  "brain","branch","brass","brave","bread","break","breakfast","breath",
  "breathe","breathing","breeze","brick","bridge","brief","bright","bring",
  "broad","broke","broken","brother","brought","brown","brush","buffalo",
  "build","building","built","buried","burn","burst","bus","bush",
  "business","busy","but","butter","buy","by","cabin","cage",
  "cake","call","calm","came","camera","camp","can","canal",
  "cannot","cap","capital","captain","captured","car","carbon","card",
  "care","careful","carefully","carried","carry","case","cast","castle",
  "cat","catch","cattle","caught","cause","cave","cell","cent",
  "center","central","century","certain","certainly","chain","chair","chamber",
  "chance","change","changing","chapter","character","characteristic","charge","chart",
  "check","cheese","chemical","chest","chicken","chief","child","children",
  "choice","choose","chose","chosen","church","circle","circus","citizen",
  "city","class","classroom","claws","clay","clean","clear","clearly",
  "climate","climb","clock","close","closely","closer","cloth","clothes",
  "clothing","cloud","club","coach","coal","coast","coat","coffee",
  "cold","collect","college","colony","color","column","combination","combine",
  "come","comfortable","coming","command","common","community","company","compare",
  "compass","complete","completely","complex","composed","composition","compound","concerned",
  "condition","congress","connected","consider","consist","consonant","constantly","construction",
  "contain","continent","continued","contrast","control","conversation","cook","cookies",
  "cool","copper","copy","corn","corner","correct","correctly","cost",
  "cotton","could","count","country","couple","courage","course","court",
  "cover","cow","cowboy","crack","cream","create","creature","crew",
  "crop","cross","crowd","cry","cup","curious","current","curve",
  "customs","cut","cutting","daily","damage","dance","danger","dangerous",
  "dark","darkness","date","daughter","dawn","day","dead","deal",
  "dear","death","decide","declared","deep","deeply","deer","definition",
  "degree","depend","depth","describe","desert","design","desk","detail",
  "determine","develop","development","diagram","diameter","did","die","differ",
  "difference","different","difficult","difficulty","dig","dinner","direct","direction",
  "directly","dirt","dirty","disappear","discover","discovery","discuss","discussion",
  "disease","dish","distance","distant","divide","division","do","doctor",
  "does","dog","doing","doll","dollar","done","donkey","door",
  "dot","double","doubt","down","dozen","draw","drawn","dream",
  "dress","drew","dried","drink","drive","driven","driver","driving",
  "drop","dropped","drove","dry","duck","due","dug","dull",
  "during","dust","duty","each","eager","ear","earlier","early",
  "earn","earth","easier","easily","east","easy","eat","eaten",
  "edge","education","effect","effort","egg","eight","either","electric",
  "electricity","element","elephant","eleven","else","empty","end","enemy",
  "energy","engine","engineer","enjoy","enough","enter","entire","entirely",
  "environment","equal","equally","equator","equipment","escape","especially","essential",
  "establish","even","evening","event","eventually","ever","every","everybody",
  "everyone","everything","everywhere","evidence","exact","exactly","examine","example",
  "excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise",
  "exist","expect","experience","experiment","explain","explanation","explore","express",
  "expression","extra","eye","face","facing","fact","factor","factory",
  "failed","fair","fairly","fall","fallen","familiar","family","famous",
  "far","farm","farmer","farther","fast","fastened","faster","fat",
  "father","favorite","fear","feathers","feature","fed","feed","feel",
  "feet","fell","fellow","felt","fence","few","fewer","field",
  "fierce","fifteen","fifth","fifty","fight","fighting","figure","fill",
  "film","final","finally","find","fine","finest","finger","finish",
  "fire","fireplace","firm","first","fish","five","fix","flag",
  "flame","flat","flew","flies","flight","floating","floor","flow",
  "flower","fly","fog","folks","follow","food","foot","football",
  "for","force","foreign","forest","forget","forgot","forgotten","form",
  "former","fort","forth","forty","forward","fought","found","four",
  "fourth","fox","frame","free","freedom","frequently","fresh","friend",
  "friendly","frighten","frog","from","front","frozen","fruit","fuel",
  "full","fully","fun","function","funny","fur","furniture","further",
  "future","gain","game","garage","garden","gas","gasoline","gate",
  "gather","gave","general","generally","gentle","gently","get","getting",
  "giant","gift","girl","give","given","giving","glad","glass",
  "globe","go","goes","gold","golden","gone","good","goose",
  "got","government","grabbed","grade","gradually","grain","grandfather","grandmother",
  "graph","grass","gravity","gray","great","greater","greatest","greatly",
  "green","grew","ground","group","grow","grown","growth","guard",
  "guess","guide","gulf","gun","habit","had","hair","half",
  "halfway","hall","hand","handle","handsome","hang","happen","happened",
  "happily","happy","harbor","hard","harder","hardly","has","hat",
  "have","having","hay","he","headed","heading","health","heard",
  "hearing","heart","heat","heavy","height","held","hello","help",
  "helpful","her","herd","here","herself","hidden","hide","high",
  "higher","highest","highway","hill","him","himself","his","history",
  "hit","hold","hole","hollow","home","honor","hope","horn",
  "horse","hospital","hot","hour","house","how","however","huge",
  "human","hundred","hung","hungry","hunt","hunter","hurried","hurry",
  "hurt","husband","ice","idea","identity","if","ill","image",
  "imagine","immediately","importance","important","impossible","improve","in","inch",
  "include","including","income","increase","indeed","independent","indicate","individual",
  "industrial","industry","influence","information","inside","instance","instant","instead",
  "instrument","interest","interior","into","introduced","invented","involved","iron",
  "is","island","it","its","itself","jack","jar","jet",
  "job","join","joined","journey","joy","judge","jump","jungle",
  "just","keep","kept","key","kids","kill","kind","kitchen",
  "knew","knife","know","knowledge","known","label","labor","lack",
  "lady","laid","lake","lamp","land","language","large","larger",
  "largest","last","late","later","laugh","law","lay","layers",
  "lead","leader","leaf","learn","least","leather","leave","leaving",
  "led","left","leg","length","lesson","let","letter","level",
  "library","lie","life","lift","light","like","likely","limited",
  "line","lion","lips","liquid","list","listen","little","live",
  "living","load","local","locate","location","log","lonely","long",
  "longer","look","loose","lose","loss","lost","lot","loud",
  "love","lovely","low","lower","luck","lucky","lunch","lungs",
  "lying","machine","machinery","mad","made","magic","magnet","mail",
  "main","mainly","major","make","making","man","managed","manner",
  "manufacturing","many","map","mark","market","married","mass","massage",
  "master","material","mathematics","matter","may","maybe","me","meal",
  "mean","means","meant","measure","meat","medicine","meet","melted",
  "member","memory","men","mental","merely","met","metal","method",
  "mice","middle","might","mighty","mile","military","milk","mill",
  "mind","mine","minerals","minute","mirror","missing","mission","mistake",
  "mix","mixture","model","modern","molecular","moment","money","monkey",
  "month","mood","moon","more","morning","most","mostly","mother",
  "motion","motor","mountain","mouse","mouth","move","movement","movie",
  "moving","mud","muscle","music","musical","must","my","myself",
  "mysterious","nails","name","nation","national","native","natural","naturally",
  "nature","near","nearby","nearer","nearest","nearly","necessary","neck",
  "needed","needle","needs","negative","neighbor","neighborhood","nervous","nest",
  "never","new","news","newspaper","next","nice","night","nine",
  "no","nobody","nodded","noise","none","noon","nor","north",
  "nose","not","note","noted","nothing","notice","noun","now",
  "number","numeral","nuts","object","observe","obtain","occasionally","occur",
  "ocean","of","off","offer","office","officer","official","oil",
  "old","older","oldest","on","once","one","only","onto",
  "open","operation","opinion","opportunity","opposite","or","orange","orbit",
  "order","ordinary","organization","organized","origin","original","other","ought",
  "our","ourselves","out","outer","outline","outside","over","own",
  "owner","oxygen","pack","package","page","paid","pain","paint",
  "pair","palace","pale","pan","paper","paragraph","parallel","parent",
  "park","part","particles","particular","particularly","partly","parts","party",
  "pass","passage","past","path","pattern","pay","peace","pen",
  "pencil","people","per","percent","perfect","perfectly","perhaps","period",
  "person","personal","pet","phrase","physical","piano","pick","picture",
  "pictured","pie","piece","pig","pile","pilot","pine","pink",
  "pipe","pitch","place","plain","plan","plane","planet","planned",
  "planning","plant","plastic","plate","plates","play","pleasant","please",
  "pleasure","plenty","plural","plus","pocket","poem","poet","poetry",
  "point","pole","police","policeman","political","pond","pony","pool",
  "poor","popular","population","porch","port","position","positive","possible",
  "possibly","post","pot","potatoes","pound","pour","powder","power",
  "powerful","practical","practice","prepare","present","president","press","pressure",
  "pretty","prevent","previous","price","pride","primitive","principal","principle",
  "printed","private","prize","probably","problem","process","produce","product",
  "production","program","progress","promised","proper","properly","property","protection",
  "proud","prove","provide","public","pull","pupil","pure","purple",
  "purpose","push","put","putting","quarter","queen","question","quick",
  "quickly","quiet","quietly","quite","rabbit","race","radio","railroad",
  "rain","raise","ran","ranch","range","rapidly","rate","rather",
  "raw","rays","reach","read","reader","ready","real","realize",
  "rear","reason","recall","receive","recent","recently","recognize","record",
  "red","refer","refused","region","regular","related","relationship","religious",
  "remain","remarkable","remember","remove","repeat","replace","replied","report",
  "represent","require","research","respect","rest","result","return","review",
  "rhyme","rhythm","rice","rich","ride","riding","right","ring",
  "rise","rising","river","road","roar","rock","rocket","rocky",
  "rod","roll","roof","room","root","rope","rose","rough",
  "round","route","row","rubbed","rubber","rule","ruler","run",
  "running","rush","sad","saddle","safe","safety","said","sail",
  "sale","salmon","salt","same","sand","sang","sat","satellites",
  "satisfied","save","saved","saw","say","scale","scared","scene",
  "school","science","scientific","scientist","score","screen","sea","search",
  "season","seat","second","secret","section","see","seed","seeing",
  "seems","seen","seldom","select","selection","sell","send","sense",
  "sent","sentence","separate","series","serious","serve","service","sets",
  "setting","settle","settlers","seven","several","shade","shadow","shake",
  "shaking","shall","shallow","shape","share","sharp","she","sheep",
  "sheet","shelf","shells","shelter","shine","shinning","ship","shirt",
  "shoe","shoot","shop","shore","short","shorter","shot","should",
  "shoulder","shout","show","shown","shut","sick","sides","sight",
  "sign","signal","silence","silent","silk","silly","silver","similar",
  "simple","simplest","simply","since","sing","single","sink","sister",
  "sit","sitting","situation","six","size","skill","skin","sky",
  "slabs","slave","sleep","slept","slide","slight","slightly","slip",
  "slipped","slope","slow","slowly","small","smaller","smallest","smell",
  "smile","smoke","smooth","snake","snow","so","soap","social",
  "society","soft","softly","soil","solar","sold","soldier","solid",
  "solution","solve","some","somebody","somehow","someone","something","sometime",
  "somewhere","son","song","soon","sort","sound","source","south",
  "southern","space","speak","special","species","specific","speech","speed",
  "spell","spend","spent","spider","spin","spirit","spite","split",
  "spoken","sport","spread","spring","square","stage","stairs","stand",
  "standard","star","stared","start","state","statement","station","stay",
  "steady","steam","steel","steep","stems","step","stepped","stick",
  "stiff","still","stock","stomach","stone","stood","stop","stopped",
  "store","storm","story","stove","straight","strange","stranger","straw",
  "stream","street","strength","stretch","strike","string","strip","strong",
  "stronger","struck","structure","struggle","stuck","student","studied","studying",
  "subject","substance","success","successful","such","sudden","suddenly","sugar",
  "suggest","suit","sum","summer","sun","sunlight","supper","supply",
  "support","suppose","sure","surface","surprise","surrounded","swam","sweet",
  "swept","swim","swimming","swing","swung","syllable","symbol","system",
  "table","tail","take","taken","tales","talk","tall","tank",
  "tape","task","taste","taught","tax","tea","teach","teacher",
  "team","tears","teeth","telephone","television","tell","temperature","ten",
  "tent","term","terrible","test","than","thank","that","thee",
  "them","themselves","then","theory","there","therefore","these","they",
  "thick","thin","thing","think","third","thirty","this","those",
  "thou","though","thought","thousand","thread","three","threw","throat",
  "through","throughout","throw","thrown","thumb","thus","thy","tide",
  "tie","tight","tightly","till","time","tin","tiny","tip",
  "tired","title","to","tobacco","today","together","told","tomorrow",
  "tone","tongue","tonight","too","took","tool","top","topic",
  "torn","total","touch","toward","tower","town","toy","trace",
  "track","trade","traffic","trail","train","transportation","trap","travel",
  "treated","tree","triangle","tribe","trick","tried","trip","troops",
  "tropical","trouble","truck","trunk","truth","try","tube","tune",
  "turn","twelve","twenty","twice","two","type","typical","uncle",
  "under","underline","understanding","unhappy","union","unit","universe","unknown",
  "unless","until","unusual","up","upon","upper","upward","us",
  "use","useful","using","usual","usually","valley","valuable","value",
  "vapor","variety","various","vast","vegetable","verb","vertical","very",
  "vessels","victory","view","village","visit","visitor","voice","volume",
  "vote","vowel","voyage","wagon","wait","walk","wall","want",
  "war","warm","warn","was","wash","waste","watch","water",
  "wave","way","we","weak","wealth","wear","weather","week",
  "weigh","weight","welcome","well","went","were","west","western",
  "wet","whale","what","whatever","wheat","wheel","when","whenever",
  "where","wherever","whether","which","while","whispered","whistle","white",
  "who","whole","whom","whose","why","wide","widely","wife",
  "wild","will","willing","win","wind","window","wing","winter",
  "wire","wise","wish","with","within","without","wolf","women",
  "won","wonder","wonderful","wood","wooden","wool","word","wore",
  "work","worker","world","worried","worry","worse","worth","would",
  "wrapped","write","writer","writing","written","wrong","wrote","yard",
  "year","yellow","yes","yesterday","yet","you","young","younger",
  "your","yourself","youth","zero","zebra","zipper","zoo","zulu"
];

function words(options) {

  function word() {
    if (options && options.maxLength > 1) {
      return generateWordWithMaxLength();
    } else {
      return generateRandomWord();
    }
  }

  function generateWordWithMaxLength() {
    let rightSize = false;
    let wordUsed;
    while (!rightSize) {  
      wordUsed = generateRandomWord();
      if(wordUsed.length <= options.maxLength) {
        rightSize = true;
      }

    }
    return wordUsed;
  }

  function generateRandomWord() {
    return wordList[randInt(wordList.length)];
  }

  function randInt(lessThan) {
    return Math.floor(Math.random() * lessThan);
  }

  // No arguments = generate one word
  if (typeof(options) === 'undefined') {
    return word();
  }

  // Just a number = return that many words
  if (typeof(options) === 'number') {
    options = { exactly: options };
  }

  // options supported: exactly, min, max, join
  if (options.exactly) {
    options.min = options.exactly;
    options.max = options.exactly;
  }
  
  // not a number = one word par string
  if (typeof(options.wordsPerString) !== 'number') {
    options.wordsPerString = 1;
  }

  //not a function = returns the raw word
  if (typeof(options.formatter) !== 'function') {
    options.formatter = (word) => word;
  }

  //not a string = separator is a space
  if (typeof(options.separator) !== 'string') {
    options.separator = ' ';
  }

  var total = options.min + randInt(options.max + 1 - options.min);
  var results = [];
  var token = '';
  var relativeIndex = 0;

  for (var i = 0; (i < total * options.wordsPerString); i++) {
    if (relativeIndex === options.wordsPerString - 1) {
      token += options.formatter(word(), relativeIndex);
    }
    else {
      token += options.formatter(word(), relativeIndex) + options.separator;
    }
    relativeIndex++;
    if ((i + 1) % options.wordsPerString === 0) {
      results.push(token);
      token = ''; 
      relativeIndex = 0;
    }
   
  }
  if (options.join) {
    results = results.join(options.join);
  }

  return results;
}

module.exports = words;
// Export the word list as it is often useful
words.wordList = wordList;
},{}]},{},[1]);
