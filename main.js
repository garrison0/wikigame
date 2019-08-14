var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");


var x = canvas.width/2;
var y = canvas.height/2;
var x2 = canvas.width/2;
var y2 = canvas.height/2;

var t = 5;
var str = "";
var myImg = new Image();
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

// true if passes filter 
async function filter(data, response){
  //console.log(data.lead.sections[0].text.includes("infobox"));
  if (response.status == 404) {
    return false;
  }
  let title = data.lead.normalizedtitle;
  return !data.lead.disambiguation 
      && data.lead.sections[0].text.includes("infobox")
      && (title.split(" ").length <= 2)
      && !(title.includes('(') || title.includes(')'))
      && (data.lead.sections.length>7)
      && !(data.lead.sections[0].text.includes("ambox")); 
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
  ctx.canvas.width  = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  //ctx.arc(x, y, 10, 0, Math.PI*2);
  //ctx.arc(x2, y2, 10, 0, Math.PI*2);
  ctx.fillStyle = "#0095DD";
  console.log(str.lead.normalizedtitle);
  //ctx.fillText(str.lead.normalizedtitle, 10, 25);
  ctx.font = '2em arial';
  ctx.fillText(str.lead.description, 0.05*canvas.width, 0.05*canvas.height);

  // hint/paraphrasing section
  if(change) {
    n = Math.floor(Math.random() * res.length);
    paraphrase(res[n]);
    change = !change; 
  } 

  ctx.fillText(str.lead.translated_text, 0.05*canvas.width, 0.1*canvas.height);
  ctx.fillText(translated_text, 0.05*canvas.width, 0.15*canvas.height);

  let obj = str.lead.image.urls;
  res = Object.keys(obj).map(key => obj[key]);
  myImg.src = res[0];

  var ratio  = 0.75* Math.min ( canvas.width / myImg.width,  canvas.height / myImg.height );

  ctx.drawImage(myImg, 0.05*canvas.width,0.2*canvas.height, myImg.width*ratio, myImg.height*ratio);
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