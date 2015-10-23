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
  return $('<style>').prop('type', 'text/css').html('/* @include ../build/style.css */').appendTo('head:first');
}

function createMenu() {
  return $('<div id="ar-bar" class="settingsMenu__item settingsMenu__item__autoreconnect"><a class="settingsMenu__link" href="#?/settings=autoreconnect">Auto Reconnect</a></div>').insertAfter('.settingsContainer .settingsMenu .settingsMenu__item:last');
}

function createContainer() {
  return $('/* @include ../build/container.html */').insertAfter('.settingsContentsWrapper .settingsContents:last');
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
