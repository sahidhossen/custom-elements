/** Include the relative styles */
const style = document.createElement('style');
style.innerHTML = `joomla-tab{display:flex;flex-direction:column}joomla-tab>ul{display:flex;padding:0;margin:0;overflow-x:auto;overflow-y:hidden;white-space:nowrap;list-style:outside none none;background-color:#f5f5f5;border-color:#ccc #ccc currentcolor;border-style:solid solid none;border-width:1px 1px 0;border-radius:.25rem .25rem 0 0;border-image:none;box-shadow:0 1px #fff inset,0 2px 3px -3px rgba(0,0,0,.15),0 -4px 0 rgba(0,0,0,.05) inset,0 0 3px rgba(0,0,0,.04)}joomla-tab a[role=tab]{position:relative;display:block;padding:.75em 1em;color:#0d1321;text-decoration:none;box-shadow:1px 0 0 rgba(0,0,0,.05)}joomla-tab a[role=tab][active]{background-color:rgba(0,0,0,.03);background-image:linear-gradient(to bottom,transparent,rgba(0,0,0,.05) 100%);border-right:0 none;border-left:0 none;border-top-left-radius:0;border-top-right-radius:0;box-shadow:2px 0 1px -1px rgba(0,0,0,.08) inset,-2px 0 1px -1px rgba(0,0,0,.08) inset,0 1px 0 rgba(0,0,0,.02) inset}joomla-tab a[role=tab][active]::after{position:absolute;right:0;bottom:-1px;left:0;height:5px;content:"";background-color:#006898;opacity:.8}joomla-tab>section{display:none;padding:15px;background-color:#fefefe;border:1px solid #ccc;border-radius:0 0 .25rem .25rem;box-shadow:0 0 3px rgba(0,0,0,.04)}joomla-tab>section[active]{display:block}joomla-tab[orientation=vertical]{flex-direction:row;align-items:flex-start}joomla-tab[orientation=vertical]>ul{flex-direction:column;min-width:30%;height:auto;overflow:hidden;border:1px solid #ccc;border-radius:.25rem;box-shadow:none}li joomla-tab[orientation=vertical]:last-of-type a{border-bottom:0}joomla-tab[orientation=vertical] a{position:relative;display:block;padding:.75em 1em;color:#0d1321;text-decoration:none;border-bottom:1px solid #ddd;box-shadow:none}joomla-tab[orientation=vertical] a[active]{background-color:#fff;background-image:none;border-right:0 none;border-left:0 none;box-shadow:none}joomla-tab[orientation=vertical] a[active]::after{top:0;bottom:0;left:-1px;width:5px;height:auto}joomla-tab[orientation=vertical]>section{padding:15px;border:0 none;box-shadow:none}joomla-tab[view=accordion]>ul{flex-direction:column;white-space:normal;border-radius:.25rem;box-shadow:0 1px #fff inset,0 0 3px rgba(0,0,0,.04)}joomla-tab[view=accordion] section{display:none;padding:15px}joomla-tab[view=accordion] section[active]{display:block;border-bottom:1px solid #ddd}joomla-tab[view=accordion] [active]{background-color:#fff}joomla-tab[view=accordion] a[role=tab]{border-bottom:1px solid #ddd}joomla-tab[view=accordion] a[role=tab][active]::after{top:0;left:0;width:5px;height:100%}`;
document.head.appendChild(style);

class JoomlaTabElement extends HTMLElement {
  /* Attributes to monitor */
  static get observedAttributes() { return ['recall', 'orientation', 'view']; }
  get recall() { return this.getAttribute('recall'); }
  get view() { return this.getAttribute('view'); }
  set view(value) { this.setAttribute('view', value); }
  get orientation() { return this.getAttribute('orientation'); }
  set orientation(value) { this.setAttribute('oriendation', value); }

  /* Lifecycle, element created */
  constructor() {
    super();

    this.hasActive = false;
    this.currentActive = '';
  }

  /* Lifecycle, element appended to the DOM */
  connectedCallback() {
    if (!this.orientation || (this.orientation && ['horizontal', 'vertical'].indexOf(this.orientation) === -1)) {
      this.orientation = 'horizontal';
    }

    // get tab elements
    const tabs = [].slice.call(this.querySelectorAll('section'));

    // Sanity check
    if (!tabs) {
      return;
    }

    // Create the navigation
    this.createNavigation(tabs);

    // Add missing role
    tabs.forEach((tab) => {
      tab.setAttribute('role', 'tabpanel');
      if (tab.hasAttribute('active')) {
        this.hasActive = true;
        this.currentActive = tab.id;
        this.querySelector(`#tab-${tab.id}`).setAttribute('aria-selected', 'true');
        this.querySelector(`#tab-${tab.id}`).setAttribute('active', '');
        this.querySelector(`#tab-${tab.id}`).setAttribute('tabindex', '0');
      }
    });

    // Fallback if no active tab
    if (!this.hasActive) {
      tabs[0].setAttribute('active', '');
      this.hasActive = true;
      this.currentActive = tabs[0].id;
      this.querySelector(`#tab-${tabs[0].id}`).setAttribute('aria-selected', 'true');
      this.querySelector(`#tab-${tabs[0].id}`).setAttribute('tabindex', '0');
      this.querySelector(`#tab-${tabs[0].id}`).setAttribute('active', '');
    }

    // Keyboard access
    this.keyListeners(tabs);

    // Check if there is a hash in the URI
    if (window.location.href.match(/#\S[^&]*/)) {
      const hash = window.location.href.match(/#\S[^&]*/);
      const element = this.querySelector(hash[0]);

      if (element) {
        // Activate any parent tabs (nested tables)
        const currentTabSet = this.findAncestor(element, 'joomla-tab');
        const parentTabSet = this.findAncestor(currentTabSet, 'joomla-tab');

        if (parentTabSet) {
          const parentTab = this.findAncestor(currentTabSet, 'section');
          parentTabSet.showTab(parentTab);
          // Now activate the given tab
          this.show(element);
        } else {
          // Now activate the given tab
          this.showTab(element);
        }
      }
    }

    // Use the sessionStorage state!
    if (this.hasAttribute('recall')) {
      this.restoreState();
    }

    // Convert tabs to accordian (for non nested tabs only)
    if (!this.querySelector('joomla-tab')) {
      this.checkView(this);
      const self = this;
      window.addEventListener('resize', () => {
        self.checkView(self);
      });
    }
  }

  /* Lifecycle, element removed from the DOM */
  disconnectedCallback() {
    const ulEl = this.querySelector('ul');
    const navigation = [].slice.call(ulEl.querySelectorAll('a'));

    navigation.forEach(function (link) {
      link.removeEventListener('click', this);
    });
    ulEl.removeEventListener('keydown', this);
  }

  /* Method to create the tabs navigation */
  createNavigation(tabs) {
    const nav = document.createElement('ul');
    nav.setAttribute('role', 'tablist');

    /** Activate Tab */
    const activateTabFromLink = (e) => {
      e.preventDefault();

      if (this.hasActive) {
        this.hideCurrent();
      }

      const currentTabLink = this.currentActive;

      // Set the selected tab as active
      // Emit show event
      this.dispatchCustomEvent('joomla.tab.show', e.target, this.querySelector(`#tab-${currentTabLink}`));
      e.target.setAttribute('active', '');
      e.target.setAttribute('aria-selected', 'true');
      e.target.setAttribute('tabindex', '0');
      this.querySelector(e.target.hash).setAttribute('active', '');
      this.querySelector(e.target.hash).removeAttribute('aria-hidden');
      this.currentActive = e.target.hash.substring(1);

      this.saveState(e.target.hash);

      // Emit shown event
      this.dispatchCustomEvent('joomla.tab.shown', e.target, this.querySelector(`#tab-${currentTabLink}`));
    };

    tabs.forEach((tab) => {
      if (!tab.id) {
        return;
      }

      const active = tab.hasAttribute('active');
      const liElement = document.createElement('li');
      const aElement = document.createElement('a');

      liElement.setAttribute('role', 'presentation');
      aElement.setAttribute('role', 'tab');
      aElement.setAttribute('aria-controls', tab.id);
      aElement.setAttribute('aria-selected', active ? 'true' : 'false');
      aElement.setAttribute('tabindex', active ? '0' : '-1');
      aElement.setAttribute('href', `#${tab.id}`);
      aElement.setAttribute('id', `tab-${tab.id}`);
      aElement.innerHTML = tab.getAttribute('name');

      if (active) {
        aElement.setAttribute('active', '');
      }

      aElement.addEventListener('click', activateTabFromLink);

      liElement.append(aElement);
      nav.append(liElement);

      // aElement.addEventListener('joomla.tab.show', function (e) { console.log('show', e) });
      // aElement.addEventListener('joomla.tab.shown', function (e) { console.log('shown', e) });
      // aElement.addEventListener('joomla.tab.hide', function (e) { console.log('hide', e) });
      // aElement.addEventListener('joomla.tab.hidden', function (e) { console.log('hidden', e) });

      tab.setAttribute('aria-labelledby', `tab-${tab.id}`);
      if (!active) {
        tab.setAttribute('aria-hidden', 'true');
      }
    });

    this.insertAdjacentElement('afterbegin', nav);
  }

  hideCurrent() {
    // Unset the current active tab
    if (this.currentActive) {
      // Emit hide event
      const el = this.querySelector(`a[aria-controls="${this.currentActive}"]`);
      this.dispatchCustomEvent('joomla.tab.hide', el, this.querySelector(`#tab-${this.currentActive}`));
      el.removeAttribute('active');
      el.setAttribute('tabindex', '-1');
      this.querySelector(`#${this.currentActive}`).removeAttribute('active');
      this.querySelector(`#${this.currentActive}`).setAttribute('aria-hidden', 'true');
      el.removeAttribute('aria-selected');
      // Emit hidden event
      this.dispatchCustomEvent('joomla.tab.hidden', el, this.querySelector(`#tab-${this.currentActive}`));
    }
  }

  showTab(tab) {
    const tabLink = document.querySelector(`#tab-${tab.id}`);
    tabLink.click();
    this.saveState(`#${tab.id}`);
  }

  show(ulLink) {
    ulLink.click();
    this.saveState(ulLink.hash);
  }

  keyListeners() {
    const keyBehaviour = (e) => {
      // collect tab targets, and their parents' prev/next (or first/last)
      const currentTab = this.querySelector(`#tab-${this.currentActive}`);
      const tablist = [].slice.call(this.querySelector('ul').querySelectorAll('a'));
      const previousTabItem = currentTab.parentNode.previousElementSibling ||
          tablist[tablist.length - 1];
      const nextTabItem = currentTab.parentNode.nextElementSibling ||
          tablist[0];

      // don't catch key events when ⌘ or Alt modifier is present
      if (e.metaKey || e.altKey) return;

      // catch left/right and up/down arrow key events
      switch (e.keyCode) {
        case 37:
        case 38:
          if (previousTabItem.tagName.toLowerCase() !== 'li') {
            previousTabItem.click();
            previousTabItem.focus();
            this.saveState(previousTabItem.hash);
          } else {
            previousTabItem.querySelector('a').click();
            previousTabItem.querySelector('a').focus();
            this.saveState(previousTabItem.hash);
          }

          e.preventDefault();
          break;
        case 39:
        case 40:
          if (nextTabItem.tagName.toLowerCase() === 'a') {
            nextTabItem.click();
            nextTabItem.focus();
            this.saveState(nextTabItem.hash);
          } else {
            nextTabItem.querySelector('a').click();
            nextTabItem.querySelector('a').focus();
            this.saveState(nextTabItem.hash);
          }

          e.preventDefault();
          break;
        default:
          break;
      }
    };
    this.querySelector('ul').addEventListener('keydown', keyBehaviour);
  }

  /*eslint-disable */
  getStorageKey() {
    return window.location.href.toString().split(window.location.host)[1].replace(/&return=[a-zA-Z0-9%]+/, '').split('#')[0];
  }
  /*eslint-disable */

  restoreState() {
    const tabLinkHash = sessionStorage.getItem(this.getStorageKey());
    if (tabLinkHash) {
      const element = this.querySelector(tabLinkHash);

      if (element) {
        // Activate any parent tabs (nested tables)
        const currentTabSet = this.findAncestor(element, 'joomla-tab');
        const parentTabSet = this.findAncestor(currentTabSet, 'joomla-tab');

        if (parentTabSet) {
          const parentTab = this.findAncestor(currentTabSet, 'section');
          parentTabSet.showTab(parentTab);
          // Now activate the given tab
          this.show(element);
        } else {
          // Now activate the given tab
          this.showTab(element);
        }
      }
    }
  }

  saveState(value) {
    const storageKey = this.getStorageKey();
    sessionStorage.setItem(storageKey, value);
  }

  /** Method to convert tabs to accordion and vice versa depending on screen size */
  checkView(self) {
    const nav = self.querySelector('ul');
    if (document.body.getBoundingClientRect().width > 920) {
      this.view = 'tabs';
      // convert to tabs
      const panels = [].slice.call(nav.querySelectorAll('section'));

      panels.forEach((panel) => {
        self.appendChild(panel);
      });
    } else {
      this.view = 'accordion';
      // convert to accordion
      const panels = [].slice.call(self.querySelectorAll('section'));

      panels.forEach((panel) => {
        const assocLink = panel.id && nav.querySelector(`a[aria-controls="${panel.id}"]`);
        if (assocLink) {
          assocLink.parentNode.appendChild(panel);
        }
      });
    }
  }

  /*eslint-disable */
  findAncestor(el, tagName) {
    while ((el = el.parentElement) && el.nodeName.toLowerCase() !== tagName);
    return el;
  }
  /*eslint-enable */

  /* Method to dispatch events */
  /*eslint-disable */
  dispatchCustomEvent(eventName, element, related) {
    const OriginalCustomEvent = new CustomEvent(eventName, { bubbles: true, cancelable: true });
    OriginalCustomEvent.relatedTarget = related;
    element.dispatchEvent(OriginalCustomEvent);
    element.removeEventListener(eventName, element);
  }
  /*eslint-enable */
}

customElements.define('joomla-tab', JoomlaTabElement);
