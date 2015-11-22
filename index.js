'use babel';

module.exports = {
  _dispatchKeyboardEvent: function (type, element, key, ctrl, alt, shift, meta) {
    const charCode = key.charCodeAt(0);
    const unicode = 'U+00' + charCode.toString(16).toUpperCase();
    const e = document.createEvent('KeyboardEvent');
    e.initKeyboardEvent(type, true, true, null, unicode, 0, ctrl, alt, shift, meta);
    document.dispatchEvent(e);
  },

  keyboardEvent: function (key, opts) {
    const element = opts.element || document.activeElement;
    this._dispatchKeyboardEvent('keydown', element, key, true, true, false, false);
    this._dispatchKeyboardEvent('keypress', element, key, true, true, false, false);
    this._dispatchKeyboardEvent('keyup', element, key, true, true, false, false);
  },

  dispatchKeyboardEvent: function (target, type, eventArgs) {
    const e = document.createEvent('KeyboardEvent');
    e.initKeyboardEvent.apply(e, [ type ].concat(eventArgs));
    if (e.keyCode === 0) {
      Object.defineProperty(e, 'keyCode', {
        get: () => undefined
      });
    }
    return target.dispatchEvent(e);
  },

  keydown: function (key, opt) {
    const unicode = 'U+' + key.charCodeAt(0).toString(16);
    const element = opt.element || document.activeElement;
    const eventArgs = [ true, true, null, unicode, 0, opt.ctrl, opt.alt, opt.shift, opt.meta ];
    this.dispatchKeyboardEvent(element, 'keydown', eventArgs);
    this.dispatchKeyboardEvent(element, 'keypress', eventArgs);
    this.dispatchKeyboardEvent(element, 'keyup', eventArgs);
  },

  activate: function (pkgUnderTest) {
    return atom.packages.activatePackage('build')
      .then(() => atom.packages.activatePackage(pkgUnderTest))
      .then(() => {
        return new Promise((resolve, reject) => {
          const buildPackage = atom.packages.getActivePackage('build');
          const provider = atom.packages.getActivePackage(pkgUnderTest).mainModule.provideBuilder();
          const check = () => {
            if (!buildPackage.mainModule || !buildPackage.mainModule.tools.find(t => t.niceName === provider.niceName)) {
              return setTimeout(check, 20);
            }
            resolve();
          };

          check();
        });
      });
  },

  awaitTargets: function () {
    return new Promise((resolve, reject) => {
      const ev = atom.notifications.onDidAddNotification((notification) => {
        if (notification.getType() === 'error' && notification.getMessage() === 'Ooops. Something went wrong.') {
          return reject(notification);
        }
        if (notification.getMessage() !== 'Build targets parsed.') {
          return null;
        }
        const nots = atom.notifications.notifications;
        nots.splice(nots.indexOf(notification), 1);

        ev.dispose();
        resolve();
      });
    });
  },

  refreshAwaitTargets: function () {
    atom.commands.dispatch(atom.views.getView(atom.workspace), 'build:refresh-targets');
    return this.awaitTargets();
  },

  vouch: function (fn /* args... */) {
    const args = Array.prototype.slice.call(arguments, 1);
    return new Promise((resolve, reject) => {
      args.push((err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
      fn.apply(null, args);
    });
  }
};
