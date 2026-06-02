// ==UserScript==
// @name         NextDNS - Advanced Allowlist/Denylist Filter
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Adds a menu icon to toggle enabled/disabled Allowlist/Denylist items.
// @match        https://my.nextdns.io/*/allowlist
// @match        https://my.nextdns.io/*/denylist
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // -
    // SETTINGS:
    // -
    const ICON_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='gray'%3E%3Cpath d='M3 4c0-.55.45-1 1-1h16c.55 0 1 .45 1 1s-.45 1-1 1H4c-.55 0-1-.45-1-1zm2 5c0-.55.45-1 1-1h12c.55 0 1 .45 1 1s-.45 1-1 1H6c-.55 0-1-.45-1-1zm3 5c0-.55.45-1 1-1h6c.55 0 1 .45 1 1s-.45 1-1 1H9c-.55 0-1-.45-1-1z'/%3E%3C/svg%3E";

    // 1. Inject the CSS rules that handle filtering and pagination overrides.
    GM_addStyle(`
        /* -
           1. HIDING RULES
           Target the exact parent wrappers the other script uses,
           and hide them if they contain an item we want filtered out.
           - */
        body[data-show-enabled="false"] .list-group > :has(input.form-check-input:checked),
        body[data-show-enabled="false"] .settings-list > :has(input.form-check-input:checked),
        body[data-show-enabled="false"] div[class*="Items"] > :has(input.form-check-input:checked),
        body[data-show-enabled="false"] div[class*="List"] > :has(input.form-check-input:checked) {
            display: none !important;
        }

        body[data-show-disabled="false"] .list-group > :has(input.form-check-input:not(:checked)),
        body[data-show-disabled="false"] .settings-list > :has(input.form-check-input:not(:checked)),
        body[data-show-disabled="false"] div[class*="Items"] > :has(input.form-check-input:not(:checked)),
        body[data-show-disabled="false"] div[class*="List"] > :has(input.form-check-input:not(:checked)) {
            display: none !important;
        }

        /* -
           2. OVERRIDE / SHOW RULES
           When a filter is active, force the wrappers of the rows we WANT
           to see to display, completely bypassing the 5-item limit script.
           - */
        body[data-show-enabled="false"][data-show-disabled="true"] .list-group > :has(input.form-check-input:not(:checked)),
        body[data-show-enabled="false"][data-show-disabled="true"] .settings-list > :has(input.form-check-input:not(:checked)),
        body[data-show-enabled="false"][data-show-disabled="true"] div[class*="Items"] > :has(input.form-check-input:not(:checked)),
        body[data-show-enabled="false"][data-show-disabled="true"] div[class*="List"] > :has(input.form-check-input:not(:checked)) {
            display: block !important;
        }

        body[data-show-enabled="true"][data-show-disabled="false"] .list-group > :has(input.form-check-input:checked),
        body[data-show-enabled="true"][data-show-disabled="false"] .settings-list > :has(input.form-check-input:checked),
        body[data-show-enabled="true"][data-show-disabled="false"] div[class*="Items"] > :has(input.form-check-input:checked),
        body[data-show-enabled="true"][data-show-disabled="false"] div[class*="List"] > :has(input.form-check-input:checked) {
            display: block !important;
        }

        /* Custom locked-in dark theme for the popup menu */
        #custom-filter-menu {
            background-color: #242424 !important;
            border: 1px solid #181818 !important;
            color: white !important;
        }
        .custom-filter-row {
            display: flex;
            align-items: center;
            padding: 4px 0;
            cursor: pointer;
        }
        .custom-filter-label {
            margin: 0;
            padding-left: 8px;
            cursor: pointer;
            user-select: none;
            font-size: 14px;
        }
    `);

    // Ensure the default states are active on page load
    document.body.setAttribute('data-show-enabled', 'true');
    document.body.setAttribute('data-show-disabled', 'true');

    function injectUI(headerElement) {
        // Find the form inside the header
        const form = headerElement.querySelector('form');
        if (!form) return;

        // Reformat the header to align items horizontally
        headerElement.style.display = 'flex';
        headerElement.style.alignItems = 'center';
        headerElement.style.justifyContent = 'space-between';
        headerElement.style.position = 'relative';
        form.style.flexGrow = '1';
        form.style.marginRight = '15px';

        // Create the clickable Icon Button
        const iconBtn = document.createElement('img');
        iconBtn.id = 'custom-filter-icon';
        iconBtn.src = ICON_URL;
        iconBtn.style.cssText = 'width: 24px; height: 24px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;';

        // Hover effects
        iconBtn.onmouseover = () => iconBtn.style.opacity = '1';
        iconBtn.onmouseout = () => iconBtn.style.opacity = '0.7';

        // Create the popup menu container
        const menu = document.createElement('div');
        menu.id = 'custom-filter-menu';

        menu.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            right: 12px;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            z-index: 1000;
            min-width: 160px;
            margin-top: 5px;
        `;

        // Populate the menu with checkboxes (and empty threats)
        menu.innerHTML = `
            <div class="custom-filter-row">
                <input type="checkbox" id="cb-show-enabled" checked style="cursor: pointer;">
                <label for="cb-show-enabled" class="custom-filter-label">Show Enabled</label>
            </div>
            <div class="custom-filter-row">
                <input type="checkbox" id="cb-show-disabled" checked style="cursor: pointer;">
                <label for="cb-show-disabled" class="custom-filter-label">Show Disabled</label>
            </div>
        `;

        // Add them to the page!
        headerElement.appendChild(iconBtn);
        headerElement.appendChild(menu);

        // Toggle the menu when the icon is clicked
        iconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        // Close the menu if user clicks anywhere else on the page
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== iconBtn) {
                menu.style.display = 'none';
            }
        });

        // Listen for checkbox changes and update the body tags
        menu.querySelector('#cb-show-enabled').addEventListener('change', (e) => {
            document.body.setAttribute('data-show-enabled', e.target.checked);
        });

        menu.querySelector('#cb-show-disabled').addEventListener('change', (e) => {
            document.body.setAttribute('data-show-disabled', e.target.checked);
        });
    }

    // Monitor page changes to inject the UI components as soon as they load
    const observer = new MutationObserver(() => {
        const targetHeaderForm = document.querySelector('.card-header form');

        if (targetHeaderForm && !document.querySelector('#custom-filter-icon')) {
            injectUI(targetHeaderForm.parentElement);
        }
    });

    // Start watching the page
    observer.observe(document.body, { childList: true, subtree: true });

})();