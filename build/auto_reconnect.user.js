// ==UserScript==
// @name        Auto Reconnect
// @namespace   dogancelik.com
// @description Auto reconnect to servers in IRCCloud
// @include     https://www.irccloud.com/*
// @version     1.0.0
// @grant       none
// @updateURL   https://github.com/dogancelik/irccloud-auto-reconnect/raw/master/build/auto_reconnect.meta.js
// @downloadURL https://github.com/dogancelik/irccloud-auto-reconnect/raw/master/build/auto_reconnect.user.js
// ==/UserScript==

(function () {

'use strict';

var Settings = {
  keyPrefix: 'ar.',
  get: function(key, def) {
    var getVal = localStorage.getItem(this.keyPrefix + key);
    if (typeof def !== 'undefined' && getVal == null) {
      this.set(key, def);
      return def;
    }
    return getVal;
  },
  set: function(key, value) {
    localStorage.setItem(this.keyPrefix + key, value);
  },
  remove: function (keys) {
    var keys = [].concat(keys);
    keys.forEach((function (key) {
      localStorage.removeItem(this.keyPrefix + key);
    }).bind(this));
  }
};

var networks, enabled, activated, selected;

function getNetworks() {
  return $('.bufferList .connection').map(function (idx) {
    var buffer = this.querySelector('span.buffer');

    return {
      buffer: buffer,
      label: $(this).find('.buffer .label').first().text().trim(),
      index: idx
    };
  }).get();
}

function createListItem (id, name) {
  var li = $('<tr>\
    <td><input type="radio" name="ar-networks-selected"></td>\
    <td><input type="checkbox" id="' + id + '"></td>\
    <th><label for="' + id + '">' + name + '</label></th>\
    </tr>');
  return li;
}

function createList(networks) {
  var ul = $('<table>').attr('id', 'ar-networks-list').addClass('checkboxForm');

  networks.forEach(function(network) {
    var id = 'ar-network-list-item-' + network.index;
    var name = network.label;
    createListItem(id, name).appendTo(ul);
  });

  return ul;
}

function embedStyle() {
  return $('<style>').prop('type', 'text/css').html('#ar-container{font-size:18px}#ar-networks-help{margin-top:7px;padding:4px;border:1px solid #ccc;border-radius:5px;}#ar-networks-help :first-child ::before{content:"!";color:#aaa;font-size:30px;font-weight:bold;float:left;padding:10px;margin-right:7px}#ar-networks-help > div{font-size:14px;padding:2px}#ar-networks-help input{margin-right:4px}#ar-networks-help input,#ar-networks-help label{vertical-align:middle}#ar-donate{font-weight:bold}#ar-enabled-label{font-weight:normal}#ar-enabled-check:not(:checked) ~ #ar-enabled-label{color:#f00;}#ar-enabled-check:not(:checked) ~ #ar-enabled-label::after{content:"Not enabled"}#ar-enabled-check:checked ~ #ar-enabled-label{color:#008000;}#ar-enabled-check:checked ~ #ar-enabled-label::after{content:"Enabled"}').appendTo('head:first');
}

function createMenu() {
  return $('<div id="ar-bar" class="settingsMenu__item settingsMenu__item__autoreconnect"><a class="settingsMenu__link" href="#?/settings=autoreconnect">Auto Reconnect</a></div>').insertAfter('.settingsContainer .settingsMenu .settingsMenu__item:last');
}

function createContainer() {
  return $('<div id="ar-container" data-section="autoreconnect" class="settingsContents settingsContents__autoreconnect"><h2 class="settingsTitle"><span>Auto Reconnect&nbsp;</span><input id="ar-enabled-check" type="checkbox"/>&nbsp;<label id="ar-enabled-label" for="ar-enabled-check"></label></h2><p class="explanation">Select the networks you want to connect when you open a new page.</p><p class="explanation">This script is intended at non-subscribers only.</p><h3 id="ar-networks-header">Networks</h3><p class="explanation"><a id="ar-networks-clear-selected" href="javascript:void(0)">Clear radio button check</a></p><div id="ar-networks-container"></div><div id="ar-networks-help"><div><input type="radio" id="ar-help-radio" checked="true"/><label for="ar-help-radio">Checked radio button is the network you want to select on startup.</label></div><div><input type="checkbox" id="ar-help-checkbox" checked="true"/><label for="ar-help-checkbox">Checked checkbox is the network you want to auto-reconnect when you are disconnected.</label></div></div><hr/><p id="ar-donate" class="explanation">If you like this script, please&nbsp;<a href="http://dogancelik.com/donate.html" target="_blank">consider a donation</a></p><p class="explanation"><a href="https://github.com/dogancelik/irccloud-auto-reconnect" target="_blank">Source code</a>&nbsp;-&nbsp;<a href="https://github.com/dogancelik/irccloud-auto-reconnect/issues" target="_blank">Report bug / Request feature</a></p></div>').insertAfter('.settingsContentsWrapper .settingsContents:last');
}

function init() {
  embedStyle();

  var menu = createMenu();
  var container = createContainer();

  container.find('#ar-enabled-check').on('change', function() {
    Settings.set('enabled', this.checked);
  }).prop('checked', JSON.parse(Settings.get('enabled', true)));

  if (window.location.hash === '#?/settings=autoreconnect') {
    window.location.hash = '#?/settings';
    menu.find('a')[0].click();
  }

  networks = getNetworks();
  enabled = JSON.parse(Settings.get('enabled'));
  activated = Settings.get('activated', '').split(',').filter(function (i) { return !!i; }).map(function (i) { return parseInt(i, 10); });
  selected = parseInt(Settings.get('selected', ''), 10);

  var list = createList(networks);
  list.appendTo(container.find('#ar-networks-container'));

  var checkboxes = list.find('input:checkbox');
  var radios = list.find('input:radio');

  // Networks to auto reconnect
  activated.forEach(function (i) {
    checkboxes.eq(i).prop('checked', true);
    if (enabled) {
      networks[i].buffer.click();
      cbc().reconnect();
    }
  });

  // One network to select
  if (!isNaN(selected)) {
    radios.eq(selected).prop('checked', true);
    if (enabled) {
      networks[selected].buffer.click();
    }
  }

  checkboxes.on('change', function() {
    var checkedBoxes = [];
    checkboxes.each(function() {
      if (this.checked) {
        checkedBoxes.push(checkboxes.index(this));
      }     
    });
    Settings.set('activated', checkedBoxes.join());
  });

  radios.on('change', function () {
    Settings.set('selected', radios.index(this).toString());
  });

  container.find('#ar-networks-clear-selected').on('click', function () {
    radios.prop('checked', false);
    Settings.remove('selected', '');
  })
}

(function checkSession () {
  if (window.hasOwnProperty('SESSION')) {
    window.SESSION.bind('init', function () {
      init();
    });
  } else {
    setTimeout(checkSession, 100);
  }
})();

})();
