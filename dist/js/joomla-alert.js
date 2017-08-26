class JoomlaAlertElement extends HTMLElement {
  /* Attributes to monitor */
  static get observedAttributes() { return ['level', 'dismiss', 'acknowledge', 'href']; }
  get level() { return this.getAttribute('level'); }
  set level(value) { return this.setAttribute('level', value); }
  get dismiss() { return this.getAttribute('dismiss'); }
  set dismiss(value) { return this.setAttribute('dismiss', value); }
  get acknowledge() { return this.getAttribute('acknowledge'); }
  set acknowledge(value) { return this.setAttribute('acknowledge', value); }
  get href() { return this.getAttribute('href'); }
  set href(value) { return this.setAttribute('href', value); }

  /* Lifecycle, element created */
  constructor() {
    super();

    /** Include the relative styles */
    if (!document.getElementById('joomla-alert-stylesheet')) {
      const style = document.createElement('style');
      style.id = 'joomla-alert-stylesheet';
      style.innerHTML = `joomla-alert{display:block;padding:.5rem 1.25rem;margin-bottom:1rem;border:1px solid transparent;opacity:0;border-radius:.25rem;transition:opacity .15s linear}joomla-alert.joomla-alert--show{opacity:1}joomla-alert .joomla-alert--close,joomla-alert .joomla-alert-button--close{position:relative;top:-.5rem;right:-1.25rem;padding:.5rem 1.25rem;color:inherit}joomla-alert .joomla-alert--close{font-size:1.5rem;font-weight:700;line-height:1;text-shadow:0 1px 0 #fff}joomla-alert .joomla-alert--close,joomla-alert .joomla-alert-button--close{float:right;color:#000;background:0 0;border:0;opacity:.5}joomla-alert .joomla-alert--close:focus,joomla-alert .joomla-alert--close:hover,joomla-alert .joomla-alert-button--close:focus,joomla-alert .joomla-alert-button--close:hover{color:#000;text-decoration:none;cursor:pointer;opacity:.75}joomla-alert button.joomla-alert-button--close{padding-top:.75rem;font-size:100%;line-height:1.15;cursor:pointer;background:0 0;border:0;-webkit-appearance:none}joomla-alert[level=success]{color:#3c763d;background-color:#dff0d8;border-color:#d0e9c6}joomla-alert[level=success] hr{border-top-color:#c1e2b3}joomla-alert[level=success] .alert-link{color:#2b542c}joomla-alert[level=info]{color:#31708f;background-color:#d9edf7;border-color:#bcdff1}joomla-alert[level=info] hr{border-top-color:#a6d5ec}joomla-alert[level=info] .alert-link{color:#245269}joomla-alert[level=warning]{color:#8a6d3b;background-color:#fcf8e3;border-color:#faf2cc}joomla-alert[level=warning] hr{border-top-color:#f7ecb5}joomla-alert[level=warning] .alert-link{color:#66512c}joomla-alert[level=danger]{color:#a94442;background-color:#f2dede;border-color:#ebcccc}joomla-alert[level=danger] hr{border-top-color:#e4b9b9}joomla-alert[level=danger] .alert-link{color:#843534}`;
      document.head.appendChild(style);
    }
  }

  /* Lifecycle, element appended to the DOM */
  connectedCallback() {
    this.setAttribute('role', 'alert');
    this.classList.add('joomla-alert--show');

    // Default to info
    if (!this.level || ['info', 'warning', 'danger', 'success'].indexOf(this.level) === -1) {
      this.setAttribute('level', 'info');
    }
    // Append button
    if (this.hasAttribute('dismiss') || this.hasAttribute('acknowledge') || (this.hasAttribute('href') && this.getAttribute('href') !== '')) {
      if (!this.querySelector('button.joomla-alert--close') && !this.querySelector('button.joomla-alert-button--close')) {
        this.appendCloseButton();
      }
    }

    this.dispatchCustomEvent('joomla.alert.show');

    const closeButton = this.querySelector('button.joomla-alert--close') || this.querySelector('button.joomla-alert-button--close');

    if (closeButton) {
      closeButton.focus();
    }
  }

  /* Lifecycle, element removed from the DOM */
  disconnectedCallback() {
    this.removeEventListener('joomla.alert.show', this);
    this.removeEventListener('joomla.alert.close', this);
    this.removeEventListener('joomla.alert.closed', this);

    if (this.firstChild.tagName && this.firstChild.tagName.toLowerCase() === 'button') {
      this.firstChild.removeEventListener('click', this);
    }
  }

  /* Respond to attribute changes */
  attributeChangedCallback(attr, oldValue, newValue) {
    switch (attr) {
      case 'level':
        if (!newValue || (newValue && ['info', 'warning', 'danger', 'success'].indexOf(newValue) === -1)) {
          this.level = 'info';
        }
        break;
      case 'dismiss':
      case 'acknowledge':
        if (!newValue || newValue === 'true') {
          this.appendCloseButton();
        } else {
          this.removeCloseButton();
        }
        break;
      case 'href':
        if (!newValue || newValue === '') {
          this.removeCloseButton();
        } else if (!this.querySelector('button.joomla-alert-button--close')) {
          this.appendCloseButton();
        }
        break;
      default:
        break;
    }
  }

  /* Method to close the alert */
  close() {
    this.dispatchCustomEvent('joomla.alert.close');
    const fireEnd = () => {
      this.dispatchCustomEvent('joomla.alert.closed');
      this.parentNode.removeChild(this);
    };

    this.addEventListener('transitionend', fireEnd);
    this.classList.remove('joomla-alert--show');
  }

  /* Method to dispatch events. Internal */
  dispatchCustomEvent(eventName) {
    const OriginalCustomEvent = new CustomEvent(eventName, { bubbles: true, cancelable: true });
    OriginalCustomEvent.relatedTarget = this;
    this.dispatchEvent(OriginalCustomEvent);
    this.removeEventListener(eventName, this);
  }

  /* Method to create the close button. Internal */
  appendCloseButton() {
    if (this.querySelector('button.joomla-alert--close') || this.querySelector('button.joomla-alert-button--close')) {
      return;
    }

    const self = this;
    const closeButton = document.createElement('button');

    if (this.hasAttribute('dismiss')) {
      closeButton.classList.add('joomla-alert--close');
      closeButton.innerHTML = '<span aria-hidden="true">&times;</span>';
      closeButton.setAttribute('aria-label', this.getText('JCLOSE', 'Close'));
    } else {
      closeButton.classList.add('joomla-alert-button--close');
      if (this.hasAttribute('acknowledge')) {
        closeButton.innerHTML = this.getText('JOK', 'ok');
      } else {
        closeButton.innerHTML = this.getText('JOPEN', 'Open');
      }
    }

    if (this.firstChild) {
      this.insertBefore(closeButton, this.firstChild);
    } else {
      this.appendChild(closeButton);
    }

    /* Add the required listener */
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        self.dispatchCustomEvent('joomla.alert.buttonClicked');
        if (self.href) {
          window.location.href = self.href;
        }
        self.close();
      });
    }

    if (this.hasAttribute('auto-dismiss')) {
      setTimeout(() => {
        self.dispatchCustomEvent('joomla.alert.buttonClicked');
        if (self.href) {
          window.location.href = self.href;
        }
        self.close();
      }, parseInt(self.getAttribute('auto-dismiss'), 50));
    }
  }

  /* Method to remove the close button. Internal */
  removeCloseButton() {
    const button = this.querySelector('button');
    if (button) {
      button.removeEventListener('click', this);
      button.parentNode.removeChild(button);
    }
  }

  /* Method to get the translated text. Internal */
  /*eslint-disable */
  getText(str, fallback) {
    return (window.Joomla && Joomla.JText && Joomla.JText._ && typeof Joomla.JText._ === 'function' && Joomla.JText._(str)) ? Joomla.JText._(str) : fallback;
  }
  /*eslint-enable */
}

customElements.define('joomla-alert', JoomlaAlertElement);
