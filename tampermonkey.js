// ==UserScript==
// @name         ILookTV playlist adjust
// @namespace    https://ilook.tv/playlist/construct
// @version      1.0
// @author       pastuh
// @match        https://ilook.tv/playlist/construct*
// @grant        GM_addStyle
// @require http://code.jquery.com/jquery-3.4.1.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/URI.js/1.19.7/URI.min.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
    #groupsList li.uk-open {
       background: #e7e7e7;
    }
    #groupsList li {
       padding-bottom: 5px;
    }
    #groupsList li:hover {
       background: #f5f5f9;
    }
    .uk-open .ch_card .uk-width-expand {
       width: 200px;
       flex: none;
    }
    .ott-marker {
       display: flex;
       align-items: center;
       justify-content: center;
    }
    .ott-status {
       cursor: pointer;
       border: 1px solid #fff;
    }
    .ott-status[data-active="true"] {
       border: 1px solid #17c60d;
    }
    .ott-status:hover {
       border: 1px solid #031902;
    }
    .ott-status[data-active="false"] {
       background: black;
       background-size: cover;
       background-clip: text;
       -webkit-background-clip: text;
       color: rgb(255 255 255 / 40%);
    }
    .ott-editor {
       display: flex;
       flex-wrap: wrap;
       flex-direction: row;
       overflow: auto;
       height: 200px;
    }
    .ott-adjust {
       background: #697178 !important;
       color: white;
       margin: 1px;
       border: 1px solid white;
       cursor: pointer;
       width: 100%;
       min-width: 100px;
       text-align: left;
    }
    .ott-adjust:hover {
       background: white;
       color: black;
    }
    `);

    let savedGroups = [];

    // Wait while the list loads
    let intervalChecker = setInterval(function() {
        let channelsList = $('#groupsList li').first();

        if(channelsList.length) {
            clearInterval(intervalChecker);
            saveGroups();

            addMarkers();
            showDisabledMarkers();
            activateMarkers();

            activateList();
        }
    }, 1000);

    // Save each list as group
    function saveGroups() {
        let groups = $('#groupsList li .uk-card');
        groups.each(function() {

            let temp_title = $(this).find('a.uk-first-column').text();
            let title = temp_title.trim();
            let id = $(this).attr("data-group");

            savedGroups.push({
                title,
                id
            });

        });
    }

    function addMarkers() {
        let groups = $('#groupsList li .uk-card');
        groups.each(function() {
            let template = `<div class="ott-marker"><span class="ott-status" data-active="true" title="Control assignment">&#9989;</span></div>`;
            $(this).append(template);
        });
    }

    function showDisabledMarkers() {
        let data = JSON.parse(localStorage.getItem("disabledMarkers") || "[]");
        if (data.length > 0) {
            for(let i = 0; i < data.length; i++) {
                let $marker = $(`#groupsList li .uk-card[data-group='${data[i].id}'] .ott-status`);
                $marker.attr('data-active', 'false');
                $marker.html('&#10062;');
            }
        }
    }

    // Allow to click markers/checkboxes
    function activateMarkers() {
        let $channelList = $('#groupsList .ott-status').on('click', function() {

            // Change icon based on clicks
            let status = ($(this).attr('data-active') == 'true') ? 'false' : 'true';
            $(this).attr('data-active', status);
            let icon = (status == 'true') ? '&#9989;' : '&#10062;';
            $(this).html(icon);

            // Get changed data
            let title = $(this).closest('.uk-card').find('a.uk-first-column').text().trim();
            let id = $(this).closest('.uk-card').attr('data-group');
            let markerData = {
                title,
                id
            }

            // Save changed data
            let disabledList = JSON.parse(localStorage.getItem("disabledMarkers") || "[]");
            if(status == 'true') {
                // If checkbox active, remove from disabled list
                for(let i = 0; i < disabledList.length; i++) {
                    if(disabledList[i].id == id) {
                        disabledList.splice(i, 1);
                        break;
                    }
                }

            } else {
                // If checkbox Not active, add to disabled list
                disabledList.push(markerData);
            }

            localStorage.setItem('disabledMarkers', JSON.stringify(disabledList));
        });

    }

    function activateList() {
        let $channelList = $('#groupsList li a').on('click', function() {

            // Remove all existing tables (allows to add new ones)
            if($('#groupsList li .ott-editor').length) {
                $('#groupsList li .ott-editor').remove();
            }

            if (!$(this).hasClass('ott-expanded')) {
                $('#groupsList li a').removeClass('ott-expanded');

                // Mark group as active
                $(this).addClass('ott-expanded');
                let visibleGroupTitle = $(this).text().trim();
                $(this).text(`${visibleGroupTitle} LOADING`);

                // Send parent element to edit later
                addGroupButtons($(this), visibleGroupTitle);
            } else {
                $(this).removeClass('ott-expanded');
            }

        });
    }

    function addGroupButtons(parentElement, visibleGroupTitle) {
        let intervalChecker = setInterval(function() {
            let $channelsBlock = $('#groupsList li.uk-open .ch_card').first();
            let $editorBlock = $('#groupsList li .ott-editor').first();

            // Add when list appears and old tables removed
            if($channelsBlock.length && !$editorBlock.length) {
                clearInterval(intervalChecker);
                addEditor(parentElement, visibleGroupTitle);
            }
        }, 1000);
    }

    function addEditor(parentElement, visibleGroupTitle) {

        let disabledList = JSON.parse(localStorage.getItem("disabledMarkers") || "[]");

        if(! $('#groupsList .uk-open .ott-editor').is(':visible')) {

            let $channelBlocks = $('#groupsList li .ch_card');
            let $elementTemplate = `<div class="ott-editor"></div>`;

            $channelBlocks.each(function(index, element) {
                $(element).append($elementTemplate);

                let channelId = $(this).attr("data-chid");
                let mainElement = $(element);
                // Add all switchers(buttons) for each block
                addChannelSwitch(mainElement, channelId, visibleGroupTitle, disabledList);

            });

            activateGroupButtons();

            parentElement.text(visibleGroupTitle);
        }
    }

    function addChannelSwitch(mainElement, channelId, visibleGroupTitle, disabledList) {

        savedGroups.forEach((group) => {
            if(visibleGroupTitle != group.title) {
                let buttonTemplate = `<span data-group="${group.id}" data-channel="[${channelId}]" class="ott-adjust uk-float-right">${group.title}</span>`;
                mainElement.find('.ott-editor').append(buttonTemplate);
            }

            //Hide specific switcher if group is disabled
            if (disabledList.length > 0) {
                for(let i = 0; i < disabledList.length; i++) {
                    if(disabledList[i].title === group.title) {
                        mainElement.find(`[data-group='${group.id}']`).css({'display':'none'});
                        break;
                    }
                }
            }

        });

    }


    function activateGroupButtons() {
        let groupEditButton = $('#groupsList .uk-open .ch_card .ott-adjust');

        groupEditButton.each(function() {

            $(this).on('click', function() {

                let element = $(this).parent().parent();
                element.css({'background':'#0e9d00'});

                let group_id = $(this).attr("data-group");
                let channel_id = $(this).attr("data-channel");

                setChannelGroup(group_id, channel_id, element);

                //After group is set, hide other list buttons
                $(this).parent().css({'visibility': 'hidden'});
            });

        });

    }

    function setChannelGroup(group_id, channel_id, element){

        let formParams = {
            chid: channel_id,
            group: group_id,
            ref_name: ''
        };

        let http = new XMLHttpRequest();
        let requestURL = URI(`https://ilook.tv/ajax/construct_set_ch_group`);

        http.open("POST", requestURL.toString(), true);
        http.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
        http.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        http.onreadystatechange = function() {
            //console.log(`done #3`, http.responseText);
            element.css({'display':'none'});
        };

        requestURL.addSearch(formParams);
        http.send(requestURL.query());
        //console.log(`Post send`, formParams);
    }


})();