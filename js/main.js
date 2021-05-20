(function() {

  var DEBUG = true;
  var default_delay = 200.0;
  // Create ink story from the content using inkjs
  var story;
  var thisScript = document.currentScript;
  var storyContainer = document.querySelector('#story');
  var outerScrollContainer = document.querySelector('.outerContainer');

  // var inkDatafile = document.currentScript.getAttribute('inkDatafile')
  var inkDatafile = scriptAttr('inkDatafile')

  fetch(inkDatafile)
    .then(response => response.json())
    .then(function(json) {
      story = new inkjs.Story(json);

      var savePoint = "";

      let savedTheme;

      // Global tags - those at the top of the ink file
      // We support:
      var globalTags = story.globalTags;
      if( globalTags ) {
        console.log("GLOBAL", globalTags);
        for(var i=0; i<story.globalTags.length; i++) {
          var globalTag = story.globalTags[i];
          var splitTag = splitPropertyTag(globalTag);
        }
      }

      // page features setup
      var hasSave = loadSavePoint();
      // setupButtons(hasSave);

      // Set initial save point
      savePoint = story.state.toJson();

      // Kick off the start of the story!
      continueStory(true);
    })

  // Main story processing function. Each time this is called it generates
  // all the next content up as far as the next set of choices.
  function getDelayLen(story) {

  }
  function continueStory(firstTime) {

    var paragraphIndex = 0;
    var delay = 0.0;

    // Don't over-scroll past new content
    var previousBottomEdge = firstTime ? 0 : contentBottomEdgeY();

    // Generate story text - loop through available content
    console.log(story);
    while(story.canContinue) {

      // Get ink to generate the next paragraph
      var paragraphText = story.Continue();
      console.log(paragraphText);
      var tags = story.currentTags;
      console.log(tags);

      // Any special tags included with this line
      var customClasses = [];
      for(var i=0; i<tags.length; i++) {
        var tag = tags[i];

        // Detect tags of the form "X: Y". Currently used for IMAGE and CLASS but could be
        // customised to be used for other things too.
        var splitTag = splitPropertyTag(tag);

        // DELAY: time
        var custom_delay = null;
        if( splitTag && splitTag.property == "DELAY") {
          custom_delay = Number(splitTag.val);
        }

        // AUDIO: src
        if( splitTag && splitTag.property == "AUDIO" ) {
          if('audio' in this) {
            this.audio.pause();
            this.audio.removeAttribute('src');
            this.audio.load();
          }
          this.audio = new Audio(splitTag.val);
          this.audio.play();
        }

        // AUDIOLOOP: src
        else if( splitTag && splitTag.property == "AUDIOLOOP" ) {
          if('audioLoop' in this) {
            this.audioLoop.pause();
            this.audioLoop.removeAttribute('src');
            this.audioLoop.load();
          }
          this.audioLoop = new Audio(splitTag.val);
          this.audioLoop.play();
          this.audioLoop.loop = true;
        }

        // IMAGE: src
        if( splitTag && splitTag.property == "IMAGE" ) {
          var imageElement = document.createElement('img');
          imageElement.src = splitTag.val;
          storyContainer.append(imageElement);

          showAfter(delay, imageElement);
          delay += default_delay;
        }

        // HEADER
        if( splitTag && splitTag.property == "HEADER" ) {
          var header_div = document.createElement('div')
          header_div.classList.add('header')

          var image_div = document.createElement('div')
          image_div.classList.add('header-img')
          var imageElement = document.createElement('img');
          imageElement.src = splitTag.val;
          imageElement.alt = "A headshot of Mara Kirdani-Ryan";
          console.log(imageElement);
          image_div.append(imageElement);
          header_div.append(image_div);

          var bio_div = document.createElement('div')
          bio_div.classList.add('header-bio')
          var name = createElem('h1', "Mara Kirdani-Ryan")
          var pronouns = createElem('a',
            {href: scriptAttr("pronounLink"),
             text: scriptAttr("pronoun")});
          var department = createElem('a',
            {href: "https://cs.washington.edu",
             text: "Paul G. Allen School of Computer Science & Engineering"});
          var uni = createElem('a',
            {href: "https://www.uw.edu",
             text: "University of Washington"});

          var mail = createElem('a', {href: "mailto:".concat(scriptAttr("email")),
            text: "email"});
          var twitter = createElem('a', {href: scriptAttr("twitter"), text: 'twitter'});
          var github = createElem('a', {href: scriptAttr("github"), text: 'github'});
          var bandcamp = createElem('a', {href: scriptAttr("bandcamp"), text: 'music'});
          var reading = createElem('a', {href: scriptAttr("reading"), text: 'reading'});
          bio_div.append(name, pronouns);
          var div = "⦙"
          div = "·"
          bio_div.append(document.createElement('br'), department);
          bio_div.append(document.createElement('br'), uni);
          bio_div.append(document.createElement('br'), mail, div, twitter, div, github, div, bandcamp, div, reading);

          header_div.append(bio_div);

          storyContainer.append(header_div);

          showAfter(delay, header_div);
          delay += default_delay;

          // showAfter(delay, bio_div);
          // delay += default_delay;

          // showAfter(delay, image_div);
          // delay += default_delay;
        }

        if( splitTag && splitTag.property == "HR" ) {
          var hrElement = document.createElement('hr');
          storyContainer.append(hrElement);

          showAfter(delay, hrElement);
          delay += default_delay;
        }

        // LINK: url
        else if( splitTag && splitTag.property == "LINK" ) {
          console.log(splitTag);
          window.location.href = splitTag.val;
        }

        // LINKOPEN: url
        else if( splitTag && splitTag.property == "LINKOPEN" ) {
          window.open(splitTag.val);
        }

        // BACKGROUND: src
        else if( splitTag && splitTag.property == "BACKGROUND" ) {
          outerScrollContainer.style.backgroundImage = 'url('+splitTag.val+')';
        }

        // CLASS: className
        else if( splitTag && splitTag.property == "CLASS" ) {
          customClasses.push(splitTag.val);
        }

        // CLEAR - removes all existing content.
        // RESTART - clears everything and restarts the story from the beginning
        else if( tag == "CLEAR" || tag == "RESTART" ) {
          removeAll("p");
          removeAll("img");
          removeAll("hr");
          removeAll(".header");

          if( tag == "RESTART" ) {
            restart();
            return;
          }
        }
      }

      // Create paragraph element (initially hidden)
      var paragraphElement = document.createElement('p');
      paragraphElement.innerHTML = paragraphText;
      storyContainer.append(paragraphElement);

      // Add any custom classes derived from ink tags
      for(var i=0; i<customClasses.length; i++)
        paragraphElement.classList.add(customClasses[i]);

      // Fade in paragraph after a short delay
      showAfter(delay, paragraphElement);
      if (DEBUG) {
        delay += default_delay;
      } else {
        if (custom_delay != null) {
          console.log(custom_delay, delay);
          delay += custom_delay;
        } else {
          var text_length = paragraphElement.innerHTML.length;
          // Assume reading length of 1000 characters/minute, 60k ms/min
          var reading_time = text_length * 20;
          delay += reading_time;
        }
      }
    }

    // Create HTML choices from ink choices
    story.currentChoices.forEach(function(choice) {
        // Create paragraph with anchor element
        var choiceElement = document.createElement('p');
        choiceElement.classList.add("choice");
        choiceElement.innerHTML = `<a href='#'>${choice.text}</a>`
        storyContainer.append(choiceElement);

        // Fade choice in after a short delay
        showAfter(delay, choiceElement);
        delay += default_delay;

        // Click on choice
        var choiceAnchorEl = choiceElement.querySelectorAll("a")[0];
        choiceAnchorEl.addEventListener("click", function(event) {

          // Don't follow <a> link
          event.preventDefault();

          // Remove all existing choices
          removeAll(".choice");

        // Tell the story where to go next
          story.ChooseChoiceIndex(choice.index);

          // This is where the save button will save from
          savePoint = story.state.toJson();
          console.log(savePoint);

          // Aaand loop
          continueStory();
        });
    });

        // Extend height to fit
        // We do this manually so that removing elements and creating new ones doesn't
        // cause the height (and therefore scroll) to jump backwards temporarily.
        storyContainer.style.height = contentBottomEdgeY()+"px";

        if( !firstTime )
          scrollDown(previousBottomEdge);

      }

  function restart() {
    story.ResetState();

    setVisible(".header", true);

    // set save point to here
    savePoint = story.state.toJson();

    continueStory(true);

    outerScrollContainer.scrollTo(0, 0);
  }

  // -----------------------------------
  // Various Helper functions
  // -----------------------------------
  function createElem(type, data) {
    var elem;
    type = type.toLowerCase()
    if (type === 'h1') {
      elem = document.createElement('h1');
      elem.innerHTML = data;
    } else if (type === 'a') {
      elem = document.createElement('a');
      elem.href = data.href;
      elem.innerHTML = data.text;
    }
    return elem;
  }

  function scriptAttr(attribute) {
    return thisScript.getAttribute(attribute);
  }

  // Fades in an element after a specified delay
  function showAfter(delay, el) {
    el.classList.add("hide");
    setTimeout(function() { el.classList.remove("hide") }, delay);
  }

  // Scrolls the page down, but no further than the bottom edge of what you could
  // see previously, so it doesn't go too far.
  function scrollDown(previousBottomEdge) {

    // Line up top of screen with the bottom of where the previous content ended
    var target = previousBottomEdge;

    // Can't go further than the very bottom of the page
    var limit = outerScrollContainer.scrollHeight - outerScrollContainer.clientHeight;
    if( target > limit ) target = limit;

    var start = outerScrollContainer.scrollTop;

    var dist = target - start;
    var duration = 300 + 300*dist/100;
    var startTime = null;
    function step(time) {
      if( startTime == null ) startTime = time;
      var t = (time-startTime) / duration;
      var lerp = 3*t*t - 2*t*t*t; // ease in/out
      outerScrollContainer.scrollTo(0, (1.0-lerp)*start + lerp*target);
      if( t < 1 ) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // The Y coordinate of the bottom end of all the story content, used
  // for growing the container, and deciding how far to scroll.
  function contentBottomEdgeY() {
    var bottomElement = storyContainer.lastElementChild;
    return bottomElement ? bottomElement.offsetTop + bottomElement.offsetHeight : 0;
  }

  // Remove all elements that match the given selector. Used for removing choices after
  // you've picked one, as well as for the CLEAR and RESTART tags.
  function removeAll(selector)
  {
    var allElements = storyContainer.querySelectorAll(selector);
    for(var i=0; i<allElements.length; i++) {
      var el = allElements[i];
      el.parentNode.removeChild(el);
    }
  }

  // Used for hiding and showing the header when you CLEAR or RESTART the story respectively.
  function setVisible(selector, visible)
  {
    var allElements = storyContainer.querySelectorAll(selector);
    for(var i=0; i<allElements.length; i++) {
      var el = allElements[i];
      if( !visible )
        el.classList.add("invisible");
      else
        el.classList.remove("invisible");
    }
  }

  // Helper for parsing out tags of the form:
  //  # PROPERTY: value
  // e.g. IMAGE: source path
  function splitPropertyTag(tag) {
    var propertySplitIdx = tag.indexOf(":");
    if( propertySplitIdx != null ) {
      var property = tag.substr(0, propertySplitIdx).trim();
      var val = tag.substr(propertySplitIdx+1).trim();
      return {
        property: property,
        val: val
      };
    }

    return null;
  }

  // Loads save state if exists in the browser memory
  function loadSavePoint() {

    try {
      let savedState = window.localStorage.getItem('save-state');
      if (savedState) {
        story.state.LoadJson(savedState);
        return true;
      }
    } catch (e) {
      console.debug("Couldn't load save state");
    }
    return false;
  }

  // Detects which theme (light or dark) to use
  function setupTheme(globalTagTheme) {

    // load theme from browser memory
    var savedTheme;
    try {
      savedTheme = window.localStorage.getItem('theme');
    } catch (e) {
      console.debug("Couldn't load saved theme");
    }

    // Check whether the OS/browser is configured for dark mode
    var browserDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark"
      || (savedTheme == undefined && globalTagTheme === "dark")
      || (savedTheme == undefined && globalTagTheme == undefined && browserDark))
      document.body.classList.add("dark");
  }

  // Used to hook up the functionality for global functionality buttons
  function setupButtons(hasSave) {

    let rewindEl = document.getElementById("rewind");
    if (rewindEl) rewindEl.addEventListener("click", function(event) {
      removeAll("p");
      removeAll("img");
      setVisible(".header", false);
      restart();
    });

    let saveEl = document.getElementById("save");
    if (saveEl) saveEl.addEventListener("click", function(event) {
      try {
        window.localStorage.setItem('save-state', savePoint);
        document.getElementById("reload").removeAttribute("disabled");
        window.localStorage.setItem('theme', document.body.classList.contains("dark") ? "dark" : "");
      } catch (e) {
        console.warn("Couldn't save state");
      }

    });

    let reloadEl = document.getElementById("reload");
    if (!hasSave) {
      reloadEl.setAttribute("disabled", "disabled");
    }
    reloadEl.addEventListener("click", function(event) {
      if (reloadEl.getAttribute("disabled"))
        return;

      removeAll("p");
      removeAll("img");
      try {
        let savedState = window.localStorage.getItem('save-state');
        if (savedState) story.state.LoadJson(savedState);
      } catch (e) {
        console.debug("Couldn't load save state");
      }
      continueStory(true);
    });

    let themeSwitchEl = document.getElementById("theme-switch");
    if (themeSwitchEl) themeSwitchEl.addEventListener("click", function(event) {
      document.body.classList.add("switched");
      document.body.classList.toggle("dark");
    });
  }

})();
