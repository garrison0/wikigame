var ed = require('edit-distance');
var randomWords = require('random-words');
var nlp = require('compromise');

// utils
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

// HTML request functions
async function getRandomArticle(game) {
  // for testing sanity, just switch the endpoint to this:
  //const endpoint = "https://en.wikipedia.org/api/rest_v1/page/mobile-sections/blue";
  try {
    let endpoint;
    if(Math.random() < 0.7){
      let word = getWord();
      endpoint = "https://en.wikipedia.org/api/rest_v1/page/mobile-sections/"
      endpoint = endpoint + word;
      endpoint = endpoint + "?redirect=true";
    } else { 
      endpoint = "https://en.wikipedia.org/api/rest_v1/page/random/mobile-sections";
    }

    const response = await fetch(endpoint);
    game.data = await response.json();
    const passed = await filter(game.data, response);
    if (!passed) await getRandomArticle(game);
    game.article = game.data;

  } catch (error) {
    console.log(error);
  }
}

async function findSynonyms(word){
  let endpoint = "https://api.datamuse.com/words?ml=";
  endpoint = endpoint + word;

  let response = await fetch(endpoint);
  let data = await response.json();

  // make plain array of synonyms from json
  var res = data.map(elem => elem.word);
  return res;
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

function paraphrase(text, game){
  translate(text, "en-ru").then(data =>
    translate(data.text[0], "ru-en").then(function(ans){
      game.translated_text = ans.text[0]
      // censor title from translated text that is displayed
      let arr = game.article.lead.normalizedtitle.split(" ");
      let article = game.article;
      let tt = game.translated_text;
      tt = tt.replace(new RegExp(article.lead.normalizedtitle, 'gi'), "?????");
      tt = tt.replace(new RegExp(article.lead.normalizedtitle + 's', 'gi'), "?????");
      for (var i = 0; i < arr.length; i++){
        tt = tt.replace(new RegExp(arr[i], 'gi'), "?????");
      }
      tt = tt.replace(/\[[\s\S]*?\]/g, '');
      tt = "..." + tt + "...";
      game.translated_text = tt;
    })
  );
}

async function filter(data, response){
  if (response.status == 404) {
    return false;
  }
  let title = data.lead.normalizedtitle;
  //let ans = data.remaining.sections.reduce((total, section) => total + section.text.length, 0); 
  //console.log(ans);
  return !data.lead.disambiguation 
      && (data.lead.sections.length > 7)
      && data.lead.sections[0].text.includes("infobox")
      && (title.split(" ").length <= 2)
      && !(title.includes('(') || title.includes(')'))
      && data.lead.image.urls.length >= 2;
      //&& ans >= 93000;
}

// ideally have subclasses for audio, text/canvas stuff,
// grabbed article, AI bot, whatever else, then 
// Game class is more or less just some globals
// with references to subclasses 
// this should favor decoupled code
class Game {
  constructor() {
    this.lastRender = 0;
    this.canvas = document.getElementById("myCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.font = '12px serif';
    this.article;
    this.myImg = new Image(100,200);
    this.change = true;
    this.translated_text;
    this.data;
    this.synonyms;
    this.input = document.querySelector('input');
    this.input.addEventListener('keyup', function onEvent(e) { 
      if (e.key === "Enter") {
      // check game logic (guess vs. answer -> transition)
      let ns = this.synonyms.map(word => Math.max(word.length / 3, 1));
      let ks = this.synonyms.map(word => editDistance(word.toLowerCase(), this.input.value.toLowerCase()));

      for (var i = 0; i < ns.length; i++){
        if (ks[i] <= ns[i]) {
          this.change = true;
          break;
        }
      }

      speechSynthesis.speak(new SpeechSynthesisUtterance('ooooooooooo'));
      this.input.value = "";
      }
    });
  }

  draw() {
    // text
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.fillStyle = "#0095DD";
    this.ctx.fillText(this.article.lead.normalizedtitle, 10, 25);
    this.ctx.fillText(this.article.lead.description, 10, 50);
    this.ctx.fillText(this.translated_text, 10, 75);

    // images
    let obj = this.article.lead.image.urls;
    let articleImages = Object.keys(obj).map(key => obj[key]);
    this.myImg.src = articleImages[0];
    this.ctx.drawImage(this.myImg,100,100);
    this.ctx.fill();
    this.ctx.closePath();
  }

  async update(dt) {
    // hint/paraphrasing section
    if(this.change) {
      await getRandomArticle(this);

      //html = article.lead.sections[0].text;
      // each time gets a random section so each time grabs new translated text ...
      // thus the glitchy rendering of a bunch of strings before it settles
      let article = this.article;
      let html = (article.remaining.sections[Math.max(0,Math.floor(Math.random()*article.remaining.sections.length - 4))]).text;
      let div = document.createElement("div");
      div.innerHTML = html;
      let text = div.textContent || div.innerText || "";
      
      let doc = nlp(text);
      let articleSentences = doc.sentences().toContinuous().out('array');

      if(article.lead.normalizedtitle.split(" ").length == 1){
        this.synonyms = await findSynonyms(article.lead.normalizedtitle);
        this.synonyms.push(article.lead.normalizedtitle);
      } else {
        this.synonyms = [article.lead.normalizedtitle];
      }

      let n = Math.max(Math.floor(0.25 * articleSentences.length), Math.min(Math.floor(0.75 * articleSentences.length), Math.floor(Math.random() * articleSentences.length)));
      paraphrase(articleSentences[n], this);

      this.change = false;
    }
  }
}

var game = new Game();

async function loop(timestamp) {
  var dt = timestamp - game.lastRender;

  await game.update(dt);
  game.draw();

  game.lastRender = timestamp;
  window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);
