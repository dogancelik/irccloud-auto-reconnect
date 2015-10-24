// ==UserScript==
// @name        Auto Reconnect
// @namespace   dogancelik.com
// @description Auto reconnect to servers in IRCCloud
// @include     https://www.irccloud.com/*
// @version     2.0.0
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

var AR_ENABLED = 'enabled';
var AR_ACTIVATED = 'activated';
var AR_NETWORK = 'selected.network';
var AR_CHANNEL = 'selected.channel';

var enabled, activated, focusedNetwork, focusedChannel;

function createListItem (id, title) {
  var prefix = 'ar-network-list-item-';
  var li = $('<tr>\
    <td><input type="radio" name="ar-networks-selected" data-id="' + id + '"></td>\
    <td><input type="checkbox" id="' + prefix + id + '" data-id="' + id + '"></td>\
    <th><label for="' + prefix + id + '">' + title + '</label></th>\
    </tr>');
  return li;
}

function createList() {
  var ul = $('<table>').attr('id', 'ar-networks-list').addClass('checkboxForm');
  SESSION.connections.forEach(function (conn) {
    createListItem(conn.id.toString(), conn.getTitle()).appendTo(ul);
  });
  return ul;
}

function populateChanList(el) {
  var option = $('<option value=""></option>');
  SESSION.buffers.forEach(function (buff) {
    option.clone().text(buff.getName()).attr('value', buff.id.toString()).appendTo(el);
  });
  return el;
}

var DATA_ID = 'id';

function findById(el, id) {
  return el.filter('[data-' + DATA_ID + '="' + id + '"]');
}

function embedStyle() {
  return $('<style>').prop('type', 'text/css').html('#ar-container{font-size:18px}#ar-networks-help{margin-top:7px;padding:4px;border:1px solid #ccc;border-radius:5px;}#ar-networks-help :first-child ::before{content:"!";color:#aaa;font-size:30px;font-weight:bold;float:left;padding:10px;margin-right:7px}#ar-networks-help > div{font-size:14px;padding:2px}#ar-networks-help input{margin-right:4px}#ar-networks-help input,#ar-networks-help label{vertical-align:middle}#ar-networks-container tr:nth-child(1){font-weight:bold;}#ar-networks-container tr:nth-child(1) td{padding:0 1px}#ar-donate{font-weight:bold}#ar-enabled-label{font-weight:normal}#ar-enabled-check:not(:checked) ~ #ar-enabled-label{color:#f00;}#ar-enabled-check:not(:checked) ~ #ar-enabled-label::after{content:"Not enabled"}#ar-enabled-check:checked ~ #ar-enabled-label{color:#008000;}#ar-enabled-check:checked ~ #ar-enabled-label::after{content:"Enabled"}').appendTo('head:first');
}

function createMenu() {
  return $('<div id="ar-bar" class="settingsMenu__item settingsMenu__item__autoreconnect"><a class="settingsMenu__link" href="#?/settings=autoreconnect">Auto Reconnect</a></div>').insertAfter('.settingsContainer .settingsMenu .settingsMenu__item:last');
}

function createContainer() {
  return $('<div id="ar-container" data-section="autoreconnect" class="settingsContents settingsContents__autoreconnect"><h2 class="settingsTitle"><span>Auto Reconnect&nbsp;</span><input id="ar-enabled-check" type="checkbox"/>&nbsp;<label id="ar-enabled-label" for="ar-enabled-check"></label></h2><p class="explanation">Select the networks you want to connect when you open a new page.</p><p class="explanation">This script is intended for non-subscribers.</p><h3 id="ar-networks-header">Networks</h3><table id="ar-networks-clean" style="display:none"><tr><td><a id="ar-networks-clear-focused" href="javascript:void(0)">×</a></td><td><a id="ar-networks-clear-activated" href="javascript:void(0)">×</a></td></tr></table><div id="ar-networks-container"></div><div id="ar-networks-help"><div><input type="radio" id="ar-help-radio" checked="true"/><label for="ar-help-radio">Checked radio button is the network you want to focus on startup.</label></div><div><input type="checkbox" id="ar-help-checkbox" checked="true"/><label for="ar-help-checkbox">Checked checkbox is the network you want to auto-reconnect when you are disconnected.</label></div></div><h3 id="ar-channel-header">Channel</h3><p class="explanation">Select a channel to focus to this channel on startup.</p><p class="form"><select id="ar-channel-input" class="input"><option value="">Disabled</option></select></p><hr/><p id="ar-donate" class="explanation">If you like this script, please&nbsp;<a href="http://dogancelik.com/donate.html" target="_blank">consider a donation</a></p><p class="explanation"><a href="https://github.com/dogancelik/irccloud-auto-reconnect" target="_blank">Source code</a>&nbsp;-&nbsp;<a href="https://github.com/dogancelik/irccloud-auto-reconnect/issues" target="_blank">Report bug / Request feature</a></p></div>').insertAfter('.settingsContentsWrapper .settingsContents:last');
}

function init() {
  embedStyle();

  var menu = createMenu();
  var container = createContainer();

  container.find('#ar-enabled-check').on('change', function() {
    Settings.set(AR_ENABLED, this.checked);
  }).prop('checked', JSON.parse(Settings.get('enabled', true)));

  if (window.location.hash === '#?/settings=autoreconnect') {
    window.location.hash = '#?/settings';
    menu.find('a')[0].click();
  }

  enabled = JSON.parse(Settings.get(AR_ENABLED));
  activated = Settings.get(AR_ACTIVATED, '').split(',').filter(function (i) { return !!i; }).map(function (i) { return parseInt(i, 10); });
  focusedNetwork = parseInt(Settings.get(AR_NETWORK, ''), 10);
  focusedChannel = parseInt(Settings.get(AR_CHANNEL, ''), 10);

  // Populate network list
  var list = createList();
  container.find('#ar-networks-clean').find('tr').detach().prependTo(list.find('tr:first').parent());
  list.appendTo(container.find('#ar-networks-container'));

  // Populate channel list
  var chanList = container.find('#ar-channel-input');
  populateChanList(chanList);

  var checkboxes = list.find('input:checkbox');
  var radios = list.find('input:radio');

  // Networks to auto reconnect
  activated.forEach(function (id) {
    var idBox = findById(checkboxes, id);
    idBox.prop('checked', true);
    if (enabled) {
      try {
        SESSION.connections.get(id).reconnect();
      } catch (e) {
        console.error("Can't find connection ID: " + id);
      }
    }
  });

  // One network to focus
  if (!isNaN(focusedNetwork) && isNaN(focusedChannel)) {
    var selectedRadio = findById(radios, focusedNetwork);
    selectedRadio.prop('checked', true);
    if (enabled) {
      try {
        SESSION.connections.get(focusedNetwork).select();
      } catch (e) {
        console.error("Can't find connection ID: " + focusedNetwork);
      }
    }
  }

  // One channel to focus
  if (!isNaN(focusedChannel)) {
    var options = chanList.children();
    var index = options.index(chanList.find('option[value="' + focusedChannel + '"]'));
    options.eq(index).prop('selected', true);
    if (enabled) {
      try {
        SESSION.buffers.get(focusedChannel).select();
      } catch (e) {
        console.error("Can't find channel ID: " + focusedChannel);
      }
    }
  }

  checkboxes.on('change', function() {
    var checkedBoxes = [];
    checkboxes.each(function() {
      if (this.checked) {
        var id = $(this).data(DATA_ID);
        checkedBoxes.push(id);
      }
    });
    Settings.set('activated', checkedBoxes.join());
  });
 
  radios.on('change', function () {
    var id = $(this).data(DATA_ID);
    Settings.set(AR_NETWORK, id);
  });

  chanList.on('change', function () {
    Settings.set(AR_CHANNEL, chanList.val());
  });

  container.find('#ar-networks-clear-focused').on('click', function () {
    radios.prop('checked', false);
    Settings.remove(AR_NETWORK);
  });

  container.find('#ar-networks-clear-activated').on('click', function () {
    checkboxes.prop('checked', false);
    Settings.remove(AR_ACTIVATED);
  });

  container.find('#ar-help-checkbox').on('change', function () {
    this.checked = true;
  });
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
