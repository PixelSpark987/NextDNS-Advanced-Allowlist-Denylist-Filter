// ==UserScript==
// @name         NextDNS - Advanced Allowlist/Denylist Filter
// @description  Adds a menu icon to toggle enabled/disabled Allowlist/Denylist items
// @author       PixelSpark987 - https://is.gd/PS987
// @version      2.0
// @namespace    http://tampermonkey.net/
// @downloadURL  https://raw.githubusercontent.com/PixelSpark987/NextDNS-Advanced-Allowlist-Denylist-Filter/refs/heads/main/NextDNS%20-%20Advanced%20Allowlist-Denylist%20Filter.js
// @updateURL    https://raw.githubusercontent.com/PixelSpark987/NextDNS-Advanced-Allowlist-Denylist-Filter/refs/heads/main/NextDNS%20-%20Advanced%20Allowlist-Denylist%20Filter.js
// @match        *://my.nextdns.io/*
// @grant        GM_addStyle
// ==/UserScript==

// Wrap everything in an Immediately Invoked Function Expression (IIFE) to prevent polluting the global scope.
(function() {
    // Enforce strict mode to catch silent JS errors and prevent global variable leaks.
    'use strict';

    // CONSTANTS: Configuration settings for placeholder matching and menu icon graphic source.
    const INPUT_PLACEHOLDER = "Add a domain...";
    const ICON_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='gray'%3E%3Cpath d='M3 4c0-.55.45-1 1-1h16c.55 0 1 .45 1 1s-.45 1-1 1H4c-.55 0-1-.45-1-1zm2 5c0-.55.45-1 1-1h12c.55 0 1 .45 1 1s-.45 1-1 1H6c-.55 0-1-.45-1-1zm3 5c0-.55.45-1 1-1h6c.55 0 1 .45 1 1s-.45 1-1 1H9c-.55 0-1-.45-1-1z'/%3E%3C/svg%3E";

    // Track the last seen URL to detect SPA route changes between tabs.
    let lastUrl = location.href;

    // 1. Inject global CSS rules that handle filtering, visibility overrides, and popup menu styling.
    GM_addStyle(`
        /* -
           1. HIDING RULES
           Target the exact parent wrappers and hide them if they contain an item we want filtered out.
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
           When a filter is active, force the wrappers of the rows we WANT to see to display.
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

        /* Custom locked-in dark theme styling for the popup menu */
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

    // Ensure default body attributes exist on script load.
    if (!document.body.hasAttribute('data-show-enabled')) {
        document.body.setAttribute('data-show-enabled', 'true');
    }
    if (!document.body.hasAttribute('data-show-disabled')) {
        document.body.setAttribute('data-show-disabled', 'true');
    }

    // Function responsible for building and inserting the UI components next to the domain search input.
    function injectUI(targetContainer, formElement) {
        // Clean up any pre-existing orphaned elements to prevent duplicates.
        const existingIcon = document.getElementById('custom-filter-icon');
        const existingMenu = document.getElementById('custom-filter-menu');
        if (existingIcon) existingIcon.remove();
        if (existingMenu) existingMenu.remove();

        // Reformat the target container flexbox properties to align items horizontally.
        targetContainer.style.display = 'flex';
        targetContainer.style.alignItems = 'center';
        targetContainer.style.justifyContent = 'space-between';
        targetContainer.style.position = 'relative';

        if (formElement) {
            formElement.style.flexGrow = '1';
            formElement.style.marginRight = '15px';
        }

        // Create the clickable filter icon image button element.
        const iconBtn = document.createElement('img');
        iconBtn.id = 'custom-filter-icon';
        iconBtn.src = ICON_URL;
        iconBtn.style.cssText = 'width: 24px; height: 24px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;';

        // Add hover listener effects for visual feedback.
        iconBtn.onmouseover = () => iconBtn.style.opacity = '1';
        iconBtn.onmouseout = () => iconBtn.style.opacity = '0.7';

        // Create the popup menu container element.
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

        // Populate the popup menu inner HTML with filter checkboxes.
        menu.innerHTML = `
            <div class="custom-filter-row">
                <input type="checkbox" id="cb-show-enabled" ${document.body.getAttribute('data-show-enabled') === 'true' ? 'checked' : ''} style="cursor: pointer;">
                <label for="cb-show-enabled" class="custom-filter-label">Show Enabled</label>
            </div>
            <div class="custom-filter-row">
                <input type="checkbox" id="cb-show-disabled" ${document.body.getAttribute('data-show-disabled') === 'true' ? 'checked' : ''} style="cursor: pointer;">
                <label for="cb-show-disabled" class="custom-filter-label">Show Disabled</label>
            </div>
        `;

        // Append the icon button and menu to the target container DOM tree.
        targetContainer.appendChild(iconBtn);
        targetContainer.appendChild(menu);

        // Toggle popup menu visibility when the filter icon is clicked.
        iconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        // Close the popup menu if the user clicks anywhere outside of it.
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== iconBtn) {
                menu.style.display = 'none';
            }
        });

        // Listen for checkbox changes and update corresponding body attributes.
        menu.querySelector('#cb-show-enabled').addEventListener('change', (e) => {
            document.body.setAttribute('data-show-enabled', e.target.checked);
        });

        menu.querySelector('#cb-show-disabled').addEventListener('change', (e) => {
            document.body.setAttribute('data-show-disabled', e.target.checked);
        });
    }

    // Check function to verify if we are on an allowlist or denylist page and inject UI if missing.
    const checkAndInject = () => {
        // Ensure current path matches allowlist or denylist routes.
        const path = window.location.pathname;
        if (!path.includes('/allowlist') && !path.includes('/denylist')) return;

        // Search for all input elements on the page.
        const inputs = Array.from(document.querySelectorAll('input'));
        // Locate the specific input matching our target placeholder.
        const targetInput = inputs.find(i => i.placeholder === INPUT_PLACEHOLDER);

        if (targetInput) {
            const form = targetInput.closest('form');
            const container = form ? form.parentElement : targetInput.parentElement;

            if (container) {
                // Verify if our icon is already injected inside this exact container.
                const existingIcon = document.getElementById('custom-filter-icon');
                if (!existingIcon || !container.contains(existingIcon)) {
                    injectUI(container, form);
                }
            }
        }
    };

    // Helper to monitor route transitions and reset/re-evaluate when switching tabs.
    const checkUrlChange = () => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            checkAndInject();
        }
    };

    // Monkey-patch history API methods (`pushState` and `replaceState`) to catch SPA navigation.
    const wrapHistoryMethod = (type) => {
        const orig = history[type];
        return function() {
            const rv = orig.apply(this, arguments);
            checkUrlChange();
            return rv;
        };
    };
    history.pushState = wrapHistoryMethod('pushState');
    history.replaceState = wrapHistoryMethod('replaceState');

    // Listen for browser back and forward history traversal events.
    window.addEventListener('popstate', checkUrlChange);

    // Initialize a tracking variable to manage requestAnimationFrame throttling.
    let pending = false;

    // MutationObserver to monitor React DOM updates and re-inject the UI if the view gets re-rendered.
    const observer = new MutationObserver(() => {
        checkUrlChange();

        if (pending) return;
        pending = true;

        requestAnimationFrame(() => {
            checkAndInject();
            pending = false;
        });
    });

    // Observe document body for child additions and subtree mutations.
    observer.observe(document.body, { childList: true, subtree: true });

    // Execute an initial check on script load.
    checkAndInject();
})();
