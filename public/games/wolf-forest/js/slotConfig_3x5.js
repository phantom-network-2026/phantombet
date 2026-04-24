// 3x5 20 lines wolf slot, RTP - 90.8%
// phaser 3.88.2
var slotConfig_3x5 = {
    symbolSizeY: 242,
    spinTime: 2000,                     // time, milliseconds
    winShowTime: 3000,                  // time, milliseconds
    showWinCoinsMessage : false,        // displaying a message with the amount of money won
    winMessageTime: 2400,               // win message show time
    minWin : 200,                       // to show big, mega, huge popup
    useBigWinCongratulation : true,     // to show big, mega, huge popup
    showWinFreeSpinsMessage : true,     // show free spin message
    showFreeGameMessage : true,

    symbAnimFrameRate: 24,      // symbols animation frame rate
    frameWidth : 224,           // frame width
    frameHeight : 240,          // frame height

    playSpinSound: false,

    lineColor : 0xFF1251,       // line color
    showWinLines : false,

    lineBetMaxValue: 20,        // slot line bet maxvalue
    useWild: true,              // use wild flag, wild can be substitute for any symbol 
                                // to create winning combinations (exclude first reel)
    wild: 'Wild',               // wild symbol name
    useScatter: true,           // use scatter flag
    scatter: 'Scatter',         // scatter functionality is not implemented in the current version 
    selectedLines: 'all',       //'all' / 'first' - selected lines at start

    useWildInFirstPosition: false,              // substitute of the first symbol not allowed
    useLineBetMultiplier: true,                 // win multiplied by bet
    useLineBetFreeSpinMultiplier: false,        // free spins win multiplied by bet
    defaultCoins: 100000,                       // default player credit

    localOffsetX: 0,                            // x offset from center for all scene objects
    localOffsetY: -84,                          // y offset from center for all scene objects

    maxHold: 2,                                 // the maximum number of slot reels that can be held

    fonts: [
        {
            fontName: 'gameFont_0',
            filePNG: 'fonts/robotoslabbold_30_0.png',
            fileXML: 'fonts/robotoslabbold_30_0.xml'
        },
        {
            fontName: 'gameFont_1',
            filePNG: 'fonts/robotoslabbold_30_1.png',
            fileXML: 'fonts/robotoslabbold_30_1.xml'
        },
        {
            fontName: 'gameFont_2',
            filePNG: 'fonts/robotoslabblack_36_2.png',
            fileXML: 'fonts/robotoslabblack_36_2.xml'
        },
    ],

    sprites: [
        // debug reference
        {
            fileName: null,
            name: 'debugreference'
        },

        // common sprites 
        {
            fileName: 'SlotMachine_3x5.png',
            name: 'slot'
        },
        {
            fileName: 'TopMask.png',
            name: 'slotmasktop'
        },
        {
            fileName: 'BottomMask.png',
            name: 'slotmaskbottom'
        },
        {
            fileName: 'PanelJackpot.png',
            name: 'paneljackpot'
        },
        {
            fileName: 'LeftTotem.png',
            name: 'slotmaskleft'
        },
        {
            fileName: 'RightTotem.png',
            name: 'slotmaskright'
        },
        {
            fileName: 'ButtonPlus.png',
            name: 'button_plus'
        },
        {
            fileName: 'ButtonPlusHover.png',
            name: 'button_plus_hover'
        },
        {
            fileName: 'ButtonMinus.png',
            name: 'button_minus'
        },
        {
            fileName: 'ButtonMinusHover.png',
            name: 'button_minus_hover'
        },
        {
            fileName: null,
            name: 'lamp_off'
        },
        {
            fileName: 'PanelTotalBet.png',
            name: 'panel_totalbet'
        },
        {
            fileName: 'PanelWin.png',
            name: 'panel_win'
        },
        {
            fileName: 'PanelLines.png',
            name: 'panel_lines'
        },
        {
            fileName: 'PanelBalance.png',
            name: 'panel_balance'
        },
        {
            fileName: null,
            name: 'button_line'
        },
        {
            fileName: null,
            name: 'button_line_hover'
        },
        {
            fileName: 'ButtonMaxBet.png',
            name: 'button_maxbet'
        },
        {
            fileName: 'ButtonMaxBetHover.png',
            name: 'button_maxbet_hover'
        },
        {
            fileName: 'ButtonSpin.png',
            name: 'button_spin'
        },
        {
            fileName: 'ButtonSpinHover.png',
            name: 'button_spin_hover'
        },
        {
            fileName: 'ButtonAutoSpin.png',
            name: 'button_autospin'
        },
        {
            fileName: 'ButtonAutoSpinHover.png',
            name: 'button_autospin_hover'
        },
        {
            fileName: 'ButtonHold.png',
            name: 'button_hold'
        },
        {
            fileName: 'ButtonHoldHover.png',
            name: 'button_hold_on'
        },
        {
            fileName: null,
            name: 'line_button'
        },
        {
            fileName: null,
            name: 'line_button_hover'
        },
        // common gui sprites 
        {
            fileName: 'ButtonMenu.png',
            name: 'button_menu'
        },
        {
            fileName: 'ButtonMenuHover.png',
            name: 'button_menu_hover'
        },
        {
            fileName: 'ButtonInfo.png',
            name: 'button_info'
        },
        {
            fileName: 'ButtonInfoHover.png',
            name: 'button_info_hover'
        },
        {
            fileName: 'ButtonSettings.png',
            name: 'button_settings'
        },
        {
            fileName: 'ButtonSettingsHover.png',
            name: 'button_settings_hover'
        },
        {
            fileName: 'ButtonRules.png',
            name: 'button_rules'
        },
        {
            fileName: 'ButtonRulesHover.png',
            name: 'button_rules_hover'
        },
        {
            fileName: 'gui/ButtonOn.png',
            name: 'button_on'
        },
        {
            fileName: 'gui/ButtonOff.png',
            name: 'button_off'
        },
        {
            fileName: 'gui/MessagePanel.png',
            name: 'message_panel'
        },   
        {
            fileName: 'gui/SmallMessagePanel.png',
            name: 'small_message_panel'
        }, 
        {
            fileName: 'gui/AboutPanel.png',
            name: 'about_panel'
        }, 
        {
            fileName: 'gui/AboutLine.png',
            name: 'about_line'
        }, 
        {
            fileName: null,
            name: 'about_title'
        }, 
        {
            fileName: 'gui/SettingsPanel.png',
            name: 'settings_panel'
        }, 
        {
            fileName: null,
            name: 'settings_title'
        },
        {
            fileName: 'gui/PayLinesTable.png',
            name: 'paylines_table'
        },
        {
            fileName: 'gui/FreeSpinPanel.png',
            name: 'freespin_panel'
        }, 
        {
            fileName: null,
            name: 'bigwin_panel'
        }, 
        {
            fileName: 'gui/HugeWinPanel.png',
            name: 'hugewin_panel'
        }, 
        {
            fileName: 'gui/MegaWinPanel.png',
            name: 'megawin_panel'
        }, 
        {
            fileName: 'gui/JackpotWinPanel.png', 
            name: 'jackpotwin_panel'
        },  
        {
            fileName: 'gui/Logo.png',
            name: 'logo'
        }, 
        {
            fileName: 'gui/ExitButton.png',
            name: 'exit_button'
        }, 
        {
            fileName: 'gui/ExitButtonHover.png',
            name: 'exit_button_hover'
        },   
        {
            fileName: null, 
            name: 'middle_button'
        }, 
        {
            fileName: null, 
            name: 'middle_button_hover'
        },   
        {
            fileName: 'gui/LongButton.png', 
            name: 'long_button'
        }, 
        {
            fileName: 'gui/LongButtonHover.png', 
            name: 'long_button_hover'
        }, 
        {
            fileName: 'gui/ExtraLongButton.png', 
            name: 'extralong_button'
        }, 
        {
            fileName: 'gui/ExtraLongButtonHover.png', 
            name: 'extralong_button_hover'
        },
        {
            fileName: 'gui/SmallButton.png', 
            name: 'small_button'
        }, 
        {
            fileName: 'gui/SmallButtonHover.png', 
            name: 'small_button_hover'
        },
        {
            fileName: 'gui/InfoPanel.png', 
            name: 'info_panel'
        },  
        {
            fileName: 'gui/grayBkg_01.png', 
            name: 'gray_01'
        },  
        {
            fileName: 'gui/whiteBkg.png', 
            name: 'white_bkg'
        },
        {
            fileName: 'gui/NextButtonHover.png', 
            name: 'next_button_hover'
        },
        {
            fileName: 'gui/NextButton.png', 
            name: 'next_button'
        },  
        {
            fileName: 'gui/PrevButtonHover.png', 
            name: 'prev_button_hover'
        },   
        {
            fileName: 'gui/PrevButton.png', 
            name: 'prev_button'
        },    
        {
            fileName: 'gui/PayLinesTitle.png', 
            name: 'paylines_title'
        }, 
        {
            fileName: 'gui/MinorTitle.png', 
            name: 'minor_title'
        },   
        {
            fileName: 'gui/MajorTitle.png', 
            name: 'major_title'
        },  
        {
            fileName: 'gui/SpecialTitle.png', 
            name: 'special_title'
        },   
        {
            fileName: 'gui/RulesTitle.png', 
            name: 'rules_title'
        },    
        {
            fileName: 'gui/InfoLine.png', 
            name: 'info_line'
        }, 
        {
            fileName: null, 
            name: 'symbol_plate'
        },   
        {
            fileName: null, 
            name: 'specsymbol_plate'
        },   
        {
            fileName: null, 
            name: 'navi_dot'
        },    
        {
            fileName: null, 
            name: 'navi_dot_active'
        },    
    ],

    symbols:
    [
        {
            fileName: 'Jsymb.png',                   // filename or null
            name: 'Jsymb',                           // sprite name
            fileNameBlurred: 'JsymbBlurred.png',     // blurry symbol file name, folder png/SymbolsBlurred
            animation: 'JsymbSheet.png',             // animation sheet file name, folder png/SymbolsSheet
            hideWinSymbol: true,                    // temporary hide the win symbol during the win animation
            useWildSubstitute: true                 // use wild substitute for the symbol
        },
        {
            fileName: 'Qsymb.png',           
            name: 'Qsymb',                   
            fileNameBlurred: 'QsymbBlurred.png', 
            animation: 'QsymbSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Ksymb.png',           
            name: 'Ksymb',                   
            fileNameBlurred: 'KsymbBlurred.png', 
            animation: 'KsymbSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Asymb.png',          
            name: 'Asymb',                   
            fileNameBlurred: 'AsymbBlurred.png', 
            animation: 'AsymbSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Tooth.png',          
            name: 'Tooth',                   
            fileNameBlurred: 'ToothBlurred.png', 
            animation: 'ToothSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Agaric.png',          
            name: 'Agaric',                   
            fileNameBlurred: 'AgaricBlurred.png', 
            animation: 'AgaricSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Compass.png',          
            name: 'Compass',                   
            fileNameBlurred: 'CompassBlurred.png', 
            animation: 'CompassSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Cone.png',          
            name: 'Cone',                   
            fileNameBlurred: 'ConeBlurred.png', 
            animation: 'ConeSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Wild.png',          
            name: 'Wild',                   
            fileNameBlurred: 'WildBlurred.png', 
            animation: 'WildSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: false
        },
        {
            fileName: 'Scatter.png',          
            name: 'Scatter',                   
            fileNameBlurred: 'ScatterBlurred.png', 
            animation: 'ScatterSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: false
        },
    ],

    reels:[
        {//0
            symbolImages: ['Qsymb', 'Ksymb', 'Asymb', 'Agaric', 'Cone', 'Compass', 'Tooth', 'Jsymb', 'Jsymb', 'Scatter', 'Tooth', 'Compass', 'Cone', 'Agaric', 'Tooth', 'Agaric'],                        
            offsetX: -448,
            offsetY: 11,
            windowImage: 'reel',    // not used
            windowsCount: 3,    
            addSpinTime: 0, // additional spin time for reel milliseconds   
        },
        {//1
            symbolImages: ['Wild', 'Ksymb', 'Qsymb', 'Asymb', 'Agaric', 'Jsymb', 'Jsymb', 'Cone', 'Compass', 'Tooth', 'Scatter', 'Wild', 'Tooth', 'Wild', 'Compass'],               
            offsetX: -224,
            offsetY: 11,
            windowImage: 'reel',        // not used
            windowsCount: 3,    
            addSpinTime: 100, // additional spin time for reel milliseconds   
        },
        { // 2
            symbolImages: ['Qsymb', 'Wild', 'Jsymb', 'Jsymb', 'Agaric', 'Compass', 'Tooth', 'Scatter', 'Asymb', 'Wild', 'Ksymb', 'Tooth', 'Wild', 'Cone', 'Wild'],   
            offsetX: 0,
            offsetY: 11,
            windowImage: 'reel',        // not used
            windowsCount: 3,
            addSpinTime: 200, // additional spin time for reel milliseconds   
        },
        { // 3
            symbolImages: ['Jsymb', 'Ksymb', 'Jsymb', 'Scatter', 'Agaric', 'Tooth', 'Compass', 'Wild', 'Cone', 'Qsymb', 'Wild', 'Asymb', 'Tooth', 'Wild'],  
            offsetX: 224,
            offsetY: 11,
            windowImage: 'reel',        // not used
            windowsCount: 3,
            addSpinTime: 300, // additional spin time for reel milliseconds     
        },
        { // 4
            symbolImages: ['Agaric', 'Scatter', 'Jsymb', 'Qsymb', 'Jsymb', 'Ksymb', 'Tooth', 'Cone', 'Asymb', 'Wild', 'Tooth', 'Compass', 'Tooth', 'Wild', 'Tooth'],   
            offsetX: 448,
            offsetY: 11,
            windowImage: 'reel',        // not used
            windowsCount: 3,
            addSpinTime: 400, // additional spin time for reel milliseconds     
        }
    ],

    // just uncomment this piece of code and you will get 20 slot lines
    /**/
    lines: [				// predefined  slot lines positions 0 - most bottom window on reels
		    [1,1,1,1,1],	// line 0 
		    [2,2,2,2,2],	// line 1 
		    [0,0,0,0,0],	// line 2 
		    [2,1,0,1,2],	// line 3 
		    [0,1,2,1,0],	// line 4 
		    [1,2,1,2,1],	// line 5 
		    [1,0,1,0,1],	// line 6 
		    [2,2,1,0,0],	// line 7 
		    [0,0,1,2,2],	// line 8 
		    [1,0,1,2,1],	// line 9 
		    [1,2,1,0,1],	// line 10 
		    [2,1,1,1,2],	// line 11 
		    [0,1,1,1,0],	// line 12 
		    [2,1,2,1,2],	// line 13 
		    [0,1,0,1,0],	// line 14 
		    [1,1,2,1,1],	// line 15 
		    [1,1,0,1,1],	// line 16 
		    [2,2,0,2,2],	// line 17 
		    [0,0,2,0,0],	// line 18 
		    [2,0,0,0,2],	// line 19 
    ],

    payLines:[
        {
            line: ['Jsymb', 'Jsymb', 'Jsymb', 'Jsymb', 'Jsymb'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Jsymb', 'Jsymb', 'Jsymb', 'Jsymb', 'any'],
            pay: 2,
            freeSpins: 0
        },
        {
            line: ['Jsymb', 'Jsymb', 'Jsymb', 'any', 'any'],
            pay: 1,
            freeSpins: 0
        },
        {
            line: ['Qsymb', 'Qsymb', 'Qsymb', 'Qsymb', 'Qsymb'],
            pay: 5,
            freeSpins: 0
        },
        {
            line: ['Qsymb', 'Qsymb', 'Qsymb', 'Qsymb', 'any'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Qsymb', 'Qsymb', 'Qsymb', 'any', 'any'],
            pay: 1,
            freeSpins: 0
        },
        {
            line: ['Ksymb', 'Ksymb', 'Ksymb', 'Ksymb', 'Ksymb'],
            pay: 7,
            freeSpins: 0
        },
        {
            line: ['Ksymb', 'Ksymb', 'Ksymb', 'Ksymb', 'any'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Ksymb', 'Ksymb', 'Ksymb', 'any', 'any'],
            pay: 2,
            freeSpins: 0
        },
        {
            line: ['Asymb', 'Asymb', 'Asymb', 'Asymb', 'Asymb'],
            pay: 8,
            freeSpins: 0
        },
        {
            line: ['Asymb', 'Asymb', 'Asymb', 'Asymb', 'any'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Asymb', 'Asymb', 'Asymb', 'any', 'any'],
            pay: 2,
            freeSpins: 0
        },
        {
            line: ['Agaric', 'Agaric', 'Agaric', 'Agaric', 'Agaric'],
            pay: 17,
            freeSpins: 0
        },
        {
            line: ['Agaric', 'Agaric', 'Agaric', 'Agaric', 'any'],
            pay: 13,
            freeSpins: 0
        },
        {
            line: ['Agaric', 'Agaric', 'Agaric', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
        {
            line: ['Cone', 'Cone', 'Cone', 'Cone', 'Cone'],
            pay: 19,
            freeSpins: 0
        },
        {
            line: ['Cone', 'Cone', 'Cone', 'Cone', 'any'],
            pay: 13,
            freeSpins: 0
        },
        {
            line: ['Cone', 'Cone', 'Cone', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
        {
            line: ['Compass', 'Compass', 'Compass', 'Compass', 'Compass'],
            pay: 20,
            freeSpins: 0
        },
        {
            line: ['Compass', 'Compass', 'Compass', 'Compass', 'any'],
            pay: 14,
            freeSpins: 0
        },
        {
            line: ['Compass', 'Compass', 'Compass', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
        {
            line: ['Tooth', 'Tooth', 'Tooth', 'Tooth', 'Tooth'],
            pay: 25,
            freeSpins: 0
        },
        {
            line: ['Tooth', 'Tooth', 'Tooth', 'Tooth', 'any'],
            pay: 15,
            freeSpins: 0
        },
        {
            line: ['Tooth', 'Tooth', 'Tooth', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
    ],
    
    scatterPayTable:[
        {
            scattersCount: 5,
            pay: 0,
            freeSpins: 5,
            winEventString: null   // this method will be called when winnings are shown (slotGame-> *winShowC) 'slotConfig.showWheelPU_6'
        },
    ],
    
    // jackpot settings
    jackpot:
    {
        symbolName: 'Jsymb',
        symbolsCount: 10,
        defaultAmount: 1000,        // coins amout at start
        increaseValue: 1,           // jackpot increment after spin
    },

    createSlotGraphic: function(scene){      
        scene.slot =  scene.addSpriteLocPos('slot', 0, -0).setDepth(-1);   
        
        scene.masktop =  scene.addSpriteLocPos('slotmasktop', 0, -376).setDepth(11);   
        scene.maskbot =  scene.addSpriteLocPos('slotmaskbottom', -16, 410).setDepth(11);   
        scene.masktleft =  scene.addSpriteLocPos('slotmaskleft', -631, -11).setDepth(11);   
        scene.masktright =  scene.addSpriteLocPos('slotmaskright', 632, -11).setDepth(11); 
        scene.paneljackpot =  scene.addSpriteLocPos('paneljackpot', 2, -423).setDepth(11);   
    },

    createReels: function(scene) {
        var _reels = [];
        for(var ri = 0; ri < this.reels.length; ri++)
        {
            _reels.push(new Reel(scene, this.reels[ri], ri, this.symbolSizeY, this.reels[ri].windowsCount, true, this.spinTime, this.symbAnimFrameRate));
            _reels[ri].scaleMaskAndOffset(1, 1.01, 0, 0);     // minor mask correction (xScale, yScale, xOffset, yOffset)
        }
        return _reels;
    },

    // optional line buttons order
    lineButtonsLeftOrder: [4, 2, 8, 10, 6, 1, 7, 9, 3, 5],
    lineButtonsRightOrder:[14, 20, 12, 18, 16, 11, 17, 13, 15, 19],

    // the number of buttons must equal the number of lines
    /*    
    createLineButtons: function(scene) {
        if(!this.lineButtonsLeftOrder || !this.lineButtonsRightOrder) return null;
        var lineButtons = [];
        for(var i = 0; i < this.lineButtonsLeftOrder.length; i++)
        {
            var lB = new LineButton(scene, 'button_line', 'button_line_hover', this.lineButtonsLeftOrder[i]);
            lineButtons.push(lB); 
            lB.create(-695,  -377 + 77 * i, 0.5, 0.5, 'gameFont_1', 42);
        }

        for(var i = 0; i < this.lineButtonsRightOrder.length; i++)
        {
            var lB = new LineButton(scene, 'button_line', 'button_line_hover', this.lineButtonsRightOrder[i]);
            lineButtons.push(lB); 
            lB.create(695, -377 + 77 * i, 0.5, 0.5, 'gameFont_1', 42);
            lB.button.setScale(-1, 1);
        }

     lineButtons.sort((a, b) => a.number - b.number);
     return lineButtons;
    },
    */
    createControls: function(scene, slotControls) {
        let depth = 11;
        slotControls.spinTextString = 'SPIN';
        function addSprite (spriteName, posX, posY, _depth)
        {
          var _sprite =  scene.addSpriteLocPos(spriteName, posX, posY); 
          _sprite.setDepth(_depth); 
          return _sprite;
        }

        function addButton (spriteNormal, spriteHover, isSwitch, posX, posY, originX, originY, _depth)
        {
          var _button = new SceneButton(scene, spriteNormal, spriteHover, isSwitch);   
          slotControls.buttons.push(_button);
          _button.create(posX, posY, originX, originY,);
          _button.setDepth(_depth); 
          return _button;
        }

        scene.totalbetPanel = addSprite('panel_totalbet', -400, 542, depth); 
        scene.linesPanel = addSprite('panel_lines', -678, 542, depth); 
        scene.balancePanel = addSprite('panel_balance', 398, 542, depth); 
        scene.winPanel = addSprite('panel_win', 679, 542, depth); 

        // maxbet button
        slotControls.slotMaxBetButton = addButton('button_maxbet', 'button_maxbet_hover', false, -134, 552, 0.5, 0.5, depth);   
        slotControls.slotMaxBetButton.addClickEvent(slotControls.maxBet_Click, slotControls);     
         
        // autoSpin button
        slotControls.slotAutoSpinButton = addButton('button_autospin', 'button_autospin_hover', true, 136, 552, 0.5, 0.5, depth); 
        slotControls.slotAutoSpinButton.button.setVisible(true);   
        slotControls.changeAutoSpinModeEvent.add((autoSpin)=>
        {
            if (!autoSpin)
            {
                slotControls.slotAutoSpinButton.release();
            }
        }, this);

        // spin button
        slotControls.slotSpinButton = new SpinButton(scene, 'button_spin', 'button_spin_hover', false);   
        slotControls.buttons.push(slotControls.slotSpinButton);
        slotControls.slotSpinButton.create(1, 534, 0.5, 0.5);    
        // slotControls.slotSpinButton.clickEvent.add(scene.handleAnimation, scene);  
        slotControls.slotSpinButton.setDepth(depth+1);

        // menu button
        let xMenu = -862; let yMenu = 552; let dYmenu = -125;  let dXmenu = 0;
        slotControls.menuButton = addButton('button_menu', 'button_menu_hover',false, xMenu, yMenu, 0.5, 0.5, depth);   
        slotControls.menuButton.addClickEvent(()=>{ 
            console.log('menu click');
            slotControls.settingsButton.button.setVisible(!slotControls.settingsButton.button.visible);  
            slotControls.rulesButton.button.setVisible(!slotControls.rulesButton.button.visible); 
            slotControls.slotInfoButton.button.setVisible(!slotControls.slotInfoButton.button.visible); 
            scene.soundController.playClip('button_click');}, this);
        slotControls.menuButton.button.setVisible(true); 

        // settings button
        slotControls.settingsButton = addButton('button_settings', 'button_settings_hover', false, xMenu + 1 * dXmenu, yMenu + 1 * dYmenu, 0.5, 0.5, depth);   
        slotControls.settingsButton.addClickEvent(()=>{ 
            console.log('settings click');
            var pu = scene.guiController.showPopUp(this.createSettingsPUHandler);
            scene.soundController.playClip('button_click');}, this);
        slotControls.settingsButton.button.setVisible(false); 

        // rules button
       slotControls.rulesButton = addButton('button_rules', 'button_rules_hover', false,  xMenu + 2 * dXmenu, yMenu+ 2 * dYmenu, 0.5, 0.5, depth);   
       slotControls.rulesButton.addClickEvent(()=>{
           var pu = scene.guiController.showPopUp(this.createInfoPUHandler);
           scene.soundController.playClip('button_click');
       }, this);   
       slotControls.rulesButton.button.setVisible(false); 

       // info button
       slotControls.slotInfoButton = addButton('button_info', 'button_info_hover', false,  xMenu + 3 * dXmenu, yMenu + 3 * dYmenu, 0.5, 0.5, depth);   
       slotControls.slotInfoButton.addClickEvent(()=>{
            console.log('info click');
           var pu = scene.guiController.showPopUp(this.createAboutPUHandler);
           scene.soundController.playClip('button_click');
       }, this);   
       slotControls.slotInfoButton.button.setVisible(false); 

        // totalbet minus button
        slotControls.totalBetMinusButton = addButton('button_minus','button_minus_hover', false, -400 - 98, 548, 0.5, 0.5, depth);   
        slotControls.totalBetMinusButton.addClickEvent(slotControls.lineBetMinus_Click, slotControls);

        // totalbet plus button
        slotControls.totalBetPlusButton = addButton('button_plus','button_plus_hover', false, -400 + 98, 548, 0.5, 0.5, depth);   
        slotControls.totalBetPlusButton.addClickEvent(slotControls.lineBetPlus_Click, slotControls);

        // sound button
        // slotControls.soundButton = addButton('button_on', 'button_off', true, -860, -300, 0.5, 0.5, depth);   
        // slotControls.soundButton.addClickEvent(()=>{scene.soundController.soundOn(!scene.soundController._soundOn);}, scene);
        // slotControls.soundButton.button.setVisible(true); 

        // lines loop button
        // slotControls.slotLinesLoopButton = addButton('button_lines', 'button_lines_hover', false, -360, 225, 0.5, 0.5, depth);   
        // slotControls.slotLinesLoopButton.addClickEvent(slotControls.linesLoop_Click, slotControls);

        // lines minus button 
        // slotControls.linesMinusButton = addButton('button_minus','button_minus_hover', false, -780 - 76, 476, 0.5, 0.5, depth);   
        // slotControls.linesMinusButton.addClickEvent(slotControls.linesMinus_Click, slotControls);
         
        // lines plus button 
        // slotControls.linesPlusButton = addButton('button_plus','button_plus_hover', false, -780 + 76, 476, 0.5, 0.5, depth);   
        // slotControls.linesPlusButton.addClickEvent(slotControls.linesPlus_Click, slotControls);

        // adding the text fields
        slotControls.linesText = scene.add.bitmapText(scene.centerX - 678, scene.centerY + 482, 'gameFont_1', 'Lines', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.linesCountText = scene.add.bitmapText(scene.centerX - 678, scene.centerY + 547, 'gameFont_2', slotControls.selectedLinesCount, 48, 1).setOrigin(0.5).setDepth(depth).setTint(0xa48857, 0xa48857, 0x1e150c, 0x1e150c).setLetterSpacing(2.4);

        // slotControls.lineBetText = scene.add.bitmapText(scene.centerX - 462, scene.centerY + 370, 'gameFont_2', 'Line Bet', 41, 1).setOrigin(0.5).setDepth(depth);
        // slotControls.lineBetAmountText = scene.add.bitmapText(scene.centerX - 420, scene.centerY + 215 + 220, 'gameFont_1', slotControls.lineBet, 43, 1).setOrigin(0.5).setDepth(depth);
 
        slotControls.totalBetText = scene.add.bitmapText(scene.centerX - 400, scene.centerY + 482, 'gameFont_1', 'Total Bet', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.totalBetSumText = scene.add.bitmapText(scene.centerX - 400, scene.centerY + 547, 'gameFont_2', slotControls.getTotalBet(), 48, 1).setOrigin(0.5).setDepth(depth).setTint(0xa48857, 0xa48857, 0x1e150c, 0x1e150c).setLetterSpacing(2.4);
 
        slotControls.creditText = scene.add.bitmapText(scene.centerX + 398, scene.centerY + 482, 'gameFont_1', 'Balance', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.creditSumText = scene.add.bitmapText(scene.centerX + 398, scene.centerY + 547, 'gameFont_2', scene.slotPlayer.coins, 48, 1).setOrigin(0.5).setDepth(depth).setTint(0xa48857, 0xa48857, 0x1e150c, 0x1e150c).setLetterSpacing(2.4);

        slotControls.winText = scene.add.bitmapText(scene.centerX + 679, scene.centerY + 482, 'gameFont_1', 'Win', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.winAmountText = scene.add.bitmapText(scene.centerX + 679, scene.centerY + 547, 'gameFont_2', '0', 48, 1).setOrigin(0.5).setDepth(depth).setTint(0xa48857, 0xa48857, 0x1e150c, 0x1e150c).setLetterSpacing(2.4);

        slotControls.jackpotText = scene.add.bitmapText(scene.centerX - 0, scene.centerY - 520, 'gameFont_1', 'Jackpot', 48, 1).setOrigin(0, 0.5).setDepth(depth);
        slotControls.jackpotText.setVisible(false);
        slotControls.jackpotAmountText = scene.add.bitmapText(scene.centerX + 0, scene.centerY - 377, 'gameFont_1', '0', 48, 1).setOrigin(0.5, 0.5).setDepth(depth+20);
        slotControls.jackpotAmountText.setVisible(true);

        slotControls.spinText = scene.add.bitmapText(scene.centerX + 0, scene.centerY + 530, 'gameFont_1', 'Spin', 54, 1).setOrigin(0.5).setDepth(depth+1);

        slotControls.infoText = scene.add.bitmapText(scene.centerX, scene.centerY + 400 + 200, 'gameFont_0', 'info', 30, 1).setOrigin(0.5).setDepth(depth);
        slotControls.infoText.setVisible(false);
 
        slotControls.freeSpinCountText = scene.add.bitmapText(scene.centerX, scene.centerY + 360 + 200, 'gameFont_0', '9999', 30, 1).setOrigin(0.5).setDepth(depth);
        slotControls.freeSpinCountText.setVisible(false);

        // hold feature
        /*     */           
        slotControls.holdButtons = [];
        for(var ri = 0; ri < this.reels.length; ri++)
        {
            var butt = 'holdButton' + ri;
            slotControls[butt] = addButton('button_hold', 'button_hold_on', true, -448 + ri * 224, 420, 0.5, 0.5, depth);   
            slotControls.holdButtons.push(slotControls[butt]);
            slotControls[butt].button.setVisible(true); 
            slotControls[butt].reelNumber = ri;
        }

        slotControls.holdMultiplierTextL = scene.add.bitmapText(scene.centerX - 760, scene.centerY + 0, 'gameFont_1', 'x 1', 68, 1).setOrigin(0.5, 0.5).setDepth(depth-1);      // left side text
        slotControls.holdMultiplierTextL.setVisible(true);
        slotControls.holdMultiplierTextR = scene.add.bitmapText(scene.centerX + 760, scene.centerY + 0, 'gameFont_1', 'x 1', 68, 1).setOrigin(0.5, 0.5).setDepth(depth-1);      // right side text
        slotControls.holdMultiplierTextR.setVisible(true);

        slotControls.hold = new HoldFeature(scene, slotControls.holdButtons, this.maxHold); // create hold feature 
 
        // slotControls.simulateSpins = new SimulateSpins(scene, true);  // it true -> repeat, else -> clamp
    },

    createInfoPUHandler: function(popup)
    {
        function createSymbolPlate5x (popup, parentContainer, symbSpriteName, posX, posY, price3x,price4x, price5x)
        {
            let symbContainer = popup.scene.add.container(posX, posY);
            parentContainer.add(symbContainer);
            let symbIcon = popup.scene.add.sprite(-140, 0, symbSpriteName).setOrigin(0.5).setScale(0.8);
            symbContainer.add(symbIcon);
    
            let textXPos = 0; let yOffs = -5;
            let text3x = popup.scene.add.bitmapText(textXPos, 48 + yOffs, 'gameFont_0', '3X', 42, 1).setOrigin(0, 0.5).setOrigin(0.5).setTint(0x56bdd0);
            symbContainer.add(text3x);
            let text3x1 = popup.scene.add.bitmapText(textXPos + 35, 48 + yOffs, 'gameFont_0', '- ' + price3x, 42, 1).setOrigin(0, 0.5).setTint(0x56bdd0);
            symbContainer.add(text3x1);
    
            let text4x = popup.scene.add.bitmapText(textXPos, 0 + yOffs, 'gameFont_0', '4X', 42, 1).setOrigin(0, 0.5).setOrigin(0.5).setTint(0x56bdd0);
            symbContainer.add(text4x);
            let text4x1 = popup.scene.add.bitmapText(textXPos + 35, 0 + yOffs, 'gameFont_0', '- ' + price4x, 42, 1).setOrigin(0, 0.5).setTint(0x56bdd0);
            symbContainer.add(text4x1);

            let text5x = popup.scene.add.bitmapText(textXPos, -48 + yOffs, 'gameFont_0', '5X', 42, 1).setOrigin(0, 0.5).setOrigin(0.5).setTint(0x56bdd0);
            symbContainer.add(text5x);
            let text5x1 = popup.scene.add.bitmapText(textXPos + 35, -48 + yOffs, 'gameFont_0', '- ' + price5x, 42, 1).setOrigin(0, 0.5).setTint(0x56bdd0);
            symbContainer.add(text5x1);
        };

        function createSpecSymbolPlate(popup, parentContainer, symbSpriteName, posX, posY, info)
        {
            let symbContainer = popup.scene.add.container(posX, posY);
            parentContainer.add(symbContainer);
            let symbIcon = popup.scene.add.sprite(0, 0, symbSpriteName).setOrigin(0.5, 0.5).setScale(0.65);
            symbContainer.add(symbIcon);
    
            let textInfo = popup.scene.add.bitmapText(130, 0, 'gameFont_0', info, 42, 0).setOrigin(0, 0.5).setTint(0x56bdd0);
            symbContainer.add(textInfo);
        };
    
        function refreshInfoPu (containers, selectors, index)
        {
            for(let i = 0; i < containers.length; i++)
            {
                containers[i].visible = (index === i);
                if(popup.scene.textures.exists('navi_dot_active') && popup.scene.textures.exists('navi_dot'))
                {
                    selectors[i].setTexture((index === i) ? 'navi_dot_active' : 'navi_dot');
                }
            }
        }

        let index = 0;
        let containers = [];
        let selectors = [];
        let yOffset = 40;

        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716); 
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, -30 + yOffset, 'info_panel').setOrigin(0.5);
        popup.add(panel);

        popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 615, -290 + yOffset);
        popup.addButton('nextButton','next_button', 'next_button_hover', false, 80, 435 + yOffset);
        popup.addButton('prevButton','prev_button', 'prev_button_hover', false, -80, 435 + yOffset);
        popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['nextButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['prevButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);

        popup['exitButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});

        popup['nextButton'].clickEvent.add(()=>
        {
            if(index < containers.length - 1) index++;
            else index = 0;
            refreshInfoPu(containers, selectors, index);
        }, this);

        popup['prevButton'].clickEvent.add(()=>
        {
            if(index > 0) index--;
            else index = containers.length - 1;
            refreshInfoPu(containers, selectors, index);
        }, this);

        // create paylines panel
        /*      */
        let linesContainer = popup.scene.add.container(0, 0 + yOffset);
        containers.push(linesContainer);
        popup.add(linesContainer);
        let linesTitle = popup.scene.add.sprite(0, -310, 'paylines_title').setOrigin(0.5);// popup.scene.add.bitmapText(0, -293, 'gameFont_1', 'Pay Lines', 72, 1).setOrigin(0.5).setOrigin(0.5).setTint(0xffffff);
        linesContainer.add(linesTitle);
        let linesTable =  popup.scene.add.sprite(0, -10, 'paylines_table').setOrigin(0.5);
        linesContainer.add(linesTable);
        let linesText = popup.scene.add.bitmapText(0, 260, 'gameFont_0', 
        'Bet lines win if the winning symbols are in succession from the leftmost reel to right', 40, 1).setOrigin(0.5).setOrigin(0.5).setTint(0x56bdd0);
        linesContainer.add(linesText);
  
        // create minor symbols panel
        let minorContainer = popup.scene.add.container(0, 0 + yOffset);
        containers.push(minorContainer);
        popup.add(minorContainer);

        let minorTitle =popup.scene.add.sprite(0, -310, 'minor_title').setOrigin(0.5);// popup.scene.add.bitmapText(0, -293, 'gameFont_1', 'Minor  Symbols', 72, 1).setOrigin(0.5).setTint(0x899fa3,0x899fa3, 0xcacfc2, 0xcacfc2);
        minorContainer.add(minorTitle);
        minorContainer.add(popup.scene.add.sprite(0,  15, 'info_line').setOrigin(0.5));

        let row1Y = -115;
        let row2Y = row1Y + 260;
        let col1X = -370;
        let colDist = 420;
        let col2X = col1X + colDist;
        let col3X = col2X + colDist;

        // minor row 1
        createSymbolPlate5x(popup, minorContainer, 'Jsymb', col1X + 0.5 * colDist, row1Y, 1, 2, 3);
        createSymbolPlate5x(popup, minorContainer, 'Qsymb', col2X + 0.5 * colDist, row1Y, 1, 3, 5);

        // minor row 2
        createSymbolPlate5x(popup, minorContainer, 'Ksymb', col1X + 0.5 * colDist, row2Y, 2, 3, 7);
        createSymbolPlate5x(popup, minorContainer, 'Asymb', col2X + 0.5 * colDist, row2Y, 2, 3, 8);

        minorContainer.visible = false;

        // create major symbols panel
        let majorContainer = popup.scene.add.container(0, 0 + yOffset);
        containers.push(majorContainer);
        popup.add(majorContainer);

        let majorTitle = popup.scene.add.sprite(0, -310, 'major_title').setOrigin(0.5);// popup.scene.add.bitmapText(0, -293, 'gameFont_1', 'Major  Symbols', 72, 1).setOrigin(0.5).setOrigin(0.5).setOrigin(0.5).setTint(0x899fa3,0x899fa3, 0xcacfc2, 0xcacfc2);
        majorContainer.add(majorTitle);
        majorContainer.add(popup.scene.add.sprite(0,  15, 'info_line').setOrigin(0.5));

        // major row 1
        createSymbolPlate5x(popup, majorContainer, 'Agaric', col1X + 0.5 * colDist, row1Y, 11, 13, 17);
        createSymbolPlate5x(popup, majorContainer, 'Cone', col2X + 0.5 * colDist, row1Y, 11, 13, 19);

        // major row 2
        createSymbolPlate5x(popup, majorContainer, 'Compass', col1X + 0.5 * colDist, row2Y, 11, 14, 20);
        createSymbolPlate5x(popup, majorContainer, 'Tooth', col2X + 0.5 * colDist, row2Y, 11, 15, 25);

        majorContainer.visible = false;

        // create special symbols panel
        let specialContainer = popup.scene.add.container(0, 0 + yOffset);
        containers.push(specialContainer);
        popup.add(specialContainer);

        let specialTitle = popup.scene.add.sprite(0, -310, 'special_title').setOrigin(0.5); // popup.scene.add.bitmapText(0, -293, 'gameFont_1', 'Special  Symbols', 72, 1).setOrigin(0.5).setOrigin(0.5).setTint(0x899fa3,0x899fa3, 0xcacfc2, 0xcacfc2);
        specialContainer.add(specialTitle);
        specialContainer.add(popup.scene.add.sprite(0, -55, 'info_line').setOrigin(0.5));
        specialContainer.add(popup.scene.add.sprite(0,  135, 'info_line').setOrigin(0.5));

        // special row 1
        createSpecSymbolPlate(popup, specialContainer, 'Wild', -460, -160 , 
        'Wild can be used with any symbols on the reels to create \n'+
        'winning  combinations (exclude first reel).');

        createSpecSymbolPlate(popup, specialContainer, 'Scatter', -460 , 30, 
        'Any  5  Scatter on the screen give the player  5  free spins. ');

        createSpecSymbolPlate(popup, specialContainer, 'Jsymb', -460 , 220, 
        'Any 10 J symbols on the screen  =  Jackpot  win!!!');

        specialContainer.visible = false;

        // create rules panel
        let rulesContainer = popup.scene.add.container(0, 0 + yOffset);
        containers.push(rulesContainer);
        popup.add(rulesContainer);
        let rulesTitle = popup.scene.add.sprite(0, -310, 'rules_title').setOrigin(0.5); //popup.scene.add.bitmapText(0, -293, 'gameFont_1', 'Rules', 72, 1).setOrigin(0.5).setOrigin(0.5).setTint(0x899fa3,0x899fa3, 0xcacfc2, 0xcacfc2);
        rulesContainer.add(rulesTitle);

        let aboutTitle = popup.scene.add.bitmapText(-570, -200, 'gameFont_1', 'ABOUT THE GAME', 42, 0).setOrigin(0,0.5).setTint(0xffffff);
        rulesContainer.add(aboutTitle);
        let aboutText = popup.scene.add.bitmapText(-570, -170, 'gameFont_0',
        'Wolf Slot is a Slot Game with 5 reels and 20 paylines oriented from left to right.\n'+ 
        'The games have 8 regular symbols that win if three or more are lined up in\n'+ 
        'sequence  on a payline, beginning from the leftmost position. The 4 high pay\n'+  
        'symbols and the 4 low pay symbols.',
        42, 0).setOrigin(0, 0).setTint(0x56bdd0);
        rulesContainer.add(aboutText);


        let howTitle = popup.scene.add.bitmapText(-570, 60+10, 'gameFont_1', 'HOW TO PLAY', 42, 0).setOrigin(0,0.5).setTint(0xffffff);
        rulesContainer.add(howTitle);
        let howText = popup.scene.add.bitmapText(-570, 90+10, 'gameFont_0',
        '- Place your bet \n- Press the Spin button to start game \n'+
        '- You can also use Max Bet button to auto bet \n'+
        '- Press the AutoSpin button to turn Auto Spin game mode', 42, 0).setOrigin(0, 0).setTint(0x56bdd0);
        rulesContainer.add(howText);

        // create navi selectors
        let dotDist = 50;
        let offsetDots = dotDist * (containers.length - 1) / 2;
        if(popup.scene.textures.exists('navi_dot_active') && popup.scene.textures.exists('navi_dot'))
        {
            for(let i = 0; i < containers.length; i++)
            {
                var selector = popup.scene.add.sprite(-offsetDots + i * dotDist, 440 + yOffset, 'navi_dot').setOrigin(0.5);
                selectors.push(selector);
                popup.add(selector);
            }
        }
        refreshInfoPu(containers, selectors, index);
    },

    createAboutPUHandler: function(popup)
    {       
        let yOffset = 83;
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716); 
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, 0 + yOffset, 'about_panel').setOrigin(0.5);
        popup.add(panel);

        // add title
        // let title = popup.scene.add.sprite(0, -330 + yOffset, 'about_title').setOrigin(0.5);
        // popup.add(title);

        // add logo
        let logo = popup.scene.add.sprite(0, -50 + yOffset, 'logo').setOrigin(0.5).setScale(0.8);
        popup.add(logo);
        popup.add(popup.scene.add.sprite(0, 80 + yOffset, 'about_line').setOrigin(0.5).setScale(1));

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 130 + yOffset, 'gameFont_0', 'Need Help?', 42, 1).setOrigin(0.5).setTint(0x56bdd0);
        popup.add(popup.messageText);

        // add buttons
        popup.addButton('supportButton','long_button', 'long_button_hover', false, 0, 214 + yOffset);
        popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 165, -215 + yOffset);

        popup['supportButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['supportButton'].clickEvent.add(()=>{window.open("http://www.mkeystudio.com"); }, popup);
        
        popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['exitButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});

        // add support button text
        popup.supText = popup.scene.add.bitmapText(0, 207 + yOffset, 'gameFont_1', 'Support', 48, 1).setOrigin(0.5).setTint(0xffffff);
        popup.add(popup.supText);
    },

    createSettingsPUHandler: function(popup)
    {    
        function refreshIcons (popup)
        {
            popup.soundIcon.setTexture( popup.scene.soundController._soundOn ? 'soundon' : 'soundoff');
            popup.musicIcon.setTexture( popup.scene.soundController._musicOn ? 'musicon' : 'musicoff');
            // console.log('refresh');
        }

        let yOffset = 83;   
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716); 
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, 0 + yOffset, 'settings_panel').setOrigin(0.5);
        popup.add(panel);

        // add title
        // let title = popup.scene.add.sprite(0, -305 + yOffset, 'settings_title').setOrigin(0.5);
        // popup.add(title);

        // sound and music text
        popup.soundText = popup.scene.add.bitmapText(-83, -130+ yOffset, 'gameFont_1', 'Sounds', 42, 1).setOrigin(0.5).setTint(0x56bdd0);
        popup.add(popup.soundText);
        popup.musicText = popup.scene.add.bitmapText(83, -130 + yOffset, 'gameFont_1', 'Music', 42, 1).setOrigin(0.5).setTint(0x56bdd0);
        popup.add(popup.musicText);

        // sound and music buttons
        popup.addButton('soundButton','button_on', 'button_off', true, -83, -43 + yOffset);
        popup.addButton('musicButton','button_on', 'button_off', true, 83, -43 + yOffset);

        popup['soundButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['soundButton'].clickEvent.add(()=>{popup.scene.soundController.soundOn(!popup.scene.soundController._soundOn);}, popup);
        if(!popup.scene.soundController._soundOn) popup['soundButton'].setPressed();

        popup['musicButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['musicButton'].clickEvent.add(()=>{popup.scene.soundController.musicOn(!popup.scene.soundController._musicOn);}, popup);
        if(!popup.scene.soundController._musicOn) popup['musicButton'].setPressed();
/*
        popup.soundIcon = popup.scene.add.sprite(-231, -82 + yOffset, 'soundon').setOrigin(0.5);
        popup.add(popup.soundIcon);
        popup.musicIcon = popup.scene.add.sprite(56, -82 + yOffset, 'musicon').setOrigin(0.5);
        popup.add(popup.musicIcon);
*/
        // privacy ant terms buttons
        popup.addButton('privacyButton','extralong_button', 'extralong_button_hover', false, 0, 101 + yOffset);
        popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 218, -217 + yOffset);
        popup.addButton('termsButton','extralong_button', 'extralong_button_hover', false, 0, 218 + yOffset);

        popup['privacyButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['privacyButton'].clickEvent.add(()=>{window.open("http://www.mkeystudio.com"); }, popup);
        
        popup['termsButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['termsButton'].clickEvent.add(()=>{window.open("http://www.mkeystudio.com"); }, popup);

        popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['exitButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});

        // privacy ant terms buttons text
        popup.privacyText = popup.scene.add.bitmapText(0, 95 + yOffset, 'gameFont_1', 'Privacy Policy', 48, 1).setOrigin(0.5).setTint(0xffffff);
        popup.add(popup.privacyText);

        popup.termsText = popup.scene.add.bitmapText(0, 210 + yOffset, 'gameFont_1', 'Terms of Use', 48, 1).setOrigin(0.5).setTint(0xffffff);
        popup.add(popup.termsText);
        // refreshIcons(popup);
    },

    createFreeGamesPUHandler(popup)
    {
        let yOffset = 0;  
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716).setAlpha(0.7);
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, -20 + yOffset, 'freespin_panel').setOrigin(0.5);
        popup.add(panel);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 90 + yOffset, 'gameFont_0', '0', 48, 1).setOrigin(0.5).setLetterSpacing(2.2).setTint(0x56bdd0);
        popup.add(popup.messageText);

        // add buttons
        popup.addButton('okButton','long_button', 'long_button_hover', false, 0, 250 + yOffset);
        popup['okButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['okButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});

        // add button text
        popup.okText = popup.scene.add.bitmapText(0, 243 + yOffset, 'gameFont_1', 'Start', 48, 1).setOrigin(0.5).setLetterSpacing(1).setOrigin(0.5).setTint(0xffffff);
        popup.add(popup.okText);
    },

    createFreeSpinsWinPUHandler: function(popup)
    {
        let yOffset = 20;  
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716).setAlpha(0.7);
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, -20 + yOffset, 'freespin_panel').setOrigin(0.5);
        popup.add(panel);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 90 + yOffset, 'gameFont_0', '0', 48, 1).setOrigin(0.5).setLetterSpacing(2.2).setTint(0x56bdd0);
        popup.add(popup.messageText);
    },

    createHugeWinPUHandler: function(popup)
    {
        let yOffset = 20; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716).setAlpha(0.7);  
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);
 
        let panel = popup.scene.add.sprite(10, -20 + yOffset, 'hugewin_panel').setOrigin(0.5); 
        popup.add(panel);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 85 + yOffset, 'gameFont_0', '0', 48, 1).setOrigin(0.5).setLetterSpacing(1).setTint(0x56bdd0);
        popup.add(popup.messageText);
    },

    createMegaWinPUHandler: function(popup)
    {
        let yOffset = 20; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716).setAlpha(0.7);  
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);
 
        let panel = popup.scene.add.sprite(10, -20 + yOffset, 'megawin_panel').setOrigin(0.5); 
        popup.add(panel);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 85 + yOffset, 'gameFont_0', '0', 48, 1).setOrigin(0.5).setLetterSpacing(1).setTint(0x56bdd0);
        popup.add(popup.messageText);
    },

    createJackpotWinPUHandler: function(popup)
    {
        let yOffset = 20; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716).setAlpha(0.7);  
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);
 
        let panel = popup.scene.add.sprite(-3, -20 + yOffset, 'jackpotwin_panel').setOrigin(0.5); 
        popup.add(panel);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 85 + yOffset, 'gameFont_0', '0', 48, 1).setOrigin(0.5).setLetterSpacing(1).setTint(0x56bdd0);
        popup.add(popup.messageText);
    },

    // just for blocking controls
    createEmptyPUHandler: function(popup)
    {
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0, 'gray_01').setOrigin(0.5).setScale(1000);
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

      // popup.debugText = popup.scene.add.bitmapText(0, 0, 'gameFont_2', 'EMPTY PU', 55, 1).setOrigin(0.5);
      // popup.add(popup.debugText);
    },

    // only message
    createSmallMessagePUHandler:function(popup)
    {
        let yOffset = 0; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716).setAlpha(0.7);
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, 0 + yOffset, 'small_message_panel').setOrigin(0.5);
        popup.add(panel);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, -0 + yOffset, 'gameFont_0', 'Message', 42, 1).setOrigin(0.5).setTint(0x56bdd0);
        popup.add(popup.messageText);
    },

    // not used 
    createWheelGamePUHandler_6: function(popup)
    {
        let yOffset = -110; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x1e1c20).setAlpha(1); 
        backGround.setInteractive(); // block bottom controls
        popup.add(backGround);

        let offsetSectText = 140;

        var sectors = [
            {
                win: 12,
                text: '12',
                isBigWin : false,
                icon: null
            },
            {
                win: 5,
                text: '5',
                isBigWin : false,
                icon: null
            },
            {
                win: 3,
                text: '3',
                isBigWin : false,
                icon: null
            },
            {
                win: 2,
                text: '2',
                isBigWin : false,
                icon: null
            },
            {
                win: 1,
                text: '1',
                isBigWin : false,
                icon: null
            },
            {
                win: 7,
                text: '7',
                isBigWin : false,
                icon: null
            },
        ];

        // wheel spin duration range, in milliseconds
        var rotationTimeRange = {
            min: 3000,
            max: 4000
        };   
        // wheel rounds before it stops
        var wheelRounds = {
            min: 3,
            max: 4
        };    
        // degrees the wheel will rotate in the opposite direction before it stops
        var backSpin = {
            min: 1,
            max: 4
        };
        var lightTweenDuration = 500;

        var sectorsCount = sectors.length;
        let wheelborder = popup.scene.add.sprite( 0, -0 + yOffset, 'wheel_border');
        popup.add(wheelborder);
        let wContainer = popup.scene.add.container(0, 0 + yOffset); 
        popup.add(wContainer);

        let wheel = popup.scene.add.sprite(0, 0, "spin_wheel").setOrigin(0.5, 0.5);
        let lightsector = popup.scene.add.sprite(0, 7 + yOffset, 'light_sector').setOrigin(0.5, 1).setAlpha(0); 
        popup.add(lightsector);
        let pointer = popup.scene.add.sprite(0, -30 + yOffset, 'pointer').setOrigin(0.50, 1);
        popup.add(pointer);
       // let pointerborder = popup.scene.add.sprite(0, -402 + yOffset, 'pointer_border').setOrigin(0.5, 0.5);
       // popup.add(pointerborder);
        let centerpin = popup.scene.add.sprite(0, 3 + yOffset, 'center_pin');
        popup.add(centerpin);

        // create wheel with sectors
        wContainer.add(wheel);
        wContainer.angle = 0;

        var sectAngle = Math.PI * 2 / sectorsCount;
        var piD2 = Math.PI / 2;
        for(var i = 0; i < sectorsCount; i++)
        {
            var _angle = -sectAngle * i - piD2;
            var _textAngle = (-sectAngle * i) * 180/Math.PI; // rotate text (-sectAngle * i - Math.PI/2) * 180/Math.PI;
            var _cos = Math.cos (_angle);
            var _sin = Math.sin (_angle)

            var posX = offsetSectText * _cos;
            var posY = offsetSectText * _sin;
            var sectorText = popup.scene.add.bitmapText(posX,  posY, 'gameFont_1', sectors[i].text, 58, 1).setOrigin(0.5, 0.5).setTint(0xffffff);
            sectorText.angle = _textAngle;
            wContainer.add(sectorText);            // wheel container
        }

        popup.canSpin = true;
        popup.animPointerComplete = true;      
        popup.wheelSpeed = 0;

        function animLightSector()
        {
            var loopsCount = 0;     // lightTween loops counter
            popup.lightTween =  popup.scene.tweens.add({
                targets: lightsector,
                alphaTopLeft: { value: 1, duration: lightTweenDuration, ease: 'Power1' },
                alphaTopRight: { value: 1, duration: lightTweenDuration, ease: 'Power1' },
                alphaBottomRight: { value: 1, duration: lightTweenDuration, ease: 'Power1' },
                alphaBottomLeft: { value: 1, duration: lightTweenDuration, ease: 'Power1' },
                yoyo: true,
                loop: 5,
                callbackScope: popup,
                onLoop: function(tween)
                {
                      loopsCount++;
                      if(loopsCount == 2)               // stop coins emitter
                      {                     
                          popup.scene.showCoins(false);
                      }
                      else if(loopsCount == 4)         
                      {

                      }
                },         
            });
        }

        function animPointer()
        {
            var dir = -1;
            popup.animPointerComplete = false;
            popup.pointerTween = popup.scene.tweens.add({
                targets: [pointer],
                angle: -15 * dir,
                duration: popup.pointerTweenDuration * 5/6,
                ease: "Cubic.easeOut",
                callbackScope: this,
                onComplete: function(tween)
                {
                    popup.scene.soundController.playClip('pointer_hit_clip', false)
                    popup.scene.tweens.add({
                        targets: [pointer],
                        angle: pointer.angle + 15 * dir,
                        duration: popup.pointerTweenDuration * 1/6,
                        ease: "Cubic.easeIn",
                        callbackScope: popup,
                        onComplete: function(tween)
                        {
                            popup.animPointerComplete = true;
                        }
                    })
                },
               
            });
        }

        // function to spin the wheel
        function spinWheel(){

            var oldTime;    // spin tween elapsed time 
            var oldValue;   // spin tween last value  
    
            // can we spin the wheel?
            if(!popup.canSpin) return;
            popup['okButton'].setInteractable(false);
    
            if(popup.lightTween != null) {
                popup.lightTween.stop();
                popup.lightTween.remove();
                lightsector.setAlpha(0);
            }
    
            popup.scene.showCoins(false);
    
            popup.scene.soundController.stopClip('wincoins_clip');
    
            // resetting text field
            // this.prizeText.setText("wait ...");
    
            // the wheel will spin round for some times. 
            var rounds = Phaser.Math.Between(wheelRounds.min, wheelRounds.max);
    
            // then will rotate by a random number from 0 to 360 degrees. This is the actual spin
            var rand_sector = Phaser.Math.Between(0, sectorsCount - 1);
            // rand_sector = 0;
            var rand_degrees = rand_sector * 360/sectorsCount;
    
            // then will rotate back by a random amount of degrees
            var backDegrees = Phaser.Math.Between(backSpin.min, backSpin.max);
    
            // now the wheel cannot spin because it's already spinning
            popup.canSpin = false;
    
            // animation tweeen for the spin
            popup.spinTween =  popup.scene.tweens.add({              
                    targets: [wContainer],                                                               // adding the wheel to tween targets               
                    angle: 360 * rounds + rand_degrees + backDegrees,                               // angle destination           
                    duration: Phaser.Math.Between(rotationTimeRange.min, rotationTimeRange.max),    // tween duration             
                    ease: "Cubic.easeOut",                              // tween easing               
                    callbackScope: popup,                               // callback scope           
                    onComplete: function(tween){                        // function to be executed once the tween has been completed
                        popup.scene.showCoins(true);                 
                        popup.scene.tweens.add({                         // another tween to rotate a bit in the opposite direction
                            targets: [wContainer],
                            angle: wContainer.angle - backDegrees,
                            duration: Phaser.Math.Between(rotationTimeRange.min, rotationTimeRange.max) / 8,
                            ease: "Cubic.easeIn",
                            callbackScope: popup,
                            onComplete: function(tween_1){
                                // popup.prizeText.setText(sectors[rand_sector].win);  // displaying prize text  
                                

                                // insert here yuor win event handler
                                popup.scene.slotPlayer.addCoins(sectors[rand_sector].win);
                                console.log('spin complete');                          
                                popup.canSpin = true;                                               // player can spin again                      
                                animLightSector();                                                  
                                popup.scene.soundController.playClip('wincoins_clip', false);
                                popup['exitButton'].button.setVisible(true);
                            }
                        })
                    },
                    onUpdate : function(tween)
                    {
                        var dValue= tween.getValue([0]) - oldValue;
                        var dTime = tween.elapsed - oldTime;
                        this.wheelSpeed = (dTime!=null) ? dValue/dTime : 0;
                        oldTime = tween.elapsed;
                        oldValue = tween.getValue([0]);
                    }
                });
            }

        function update(time, delta) // lamps blink
        {
            if(popup.animPointerComplete && popup.wheelSpeed > 0.1)
            {
               popup.pointerTweenDuration = 360/popup.wheelSpeed/sectorsCount;
               animPointer();
            }
        }

        function closeHandler()
        {
            popup.scene.updateEvent.remove(update);
            popup.scene.showCoins(false);
            if(popup.lightTween != null)
            {
                popup.lightTween.stop();
                popup.lightTween.remove();
            }
            if(popup.pointerTween!=null)
            {
                popup.pointerTween.stop();
                popup.pointerTween.remove();
            }
            if(popup.spinTween!=null){
                popup.spinTween.stop();
                 popup.spinTween.remove();
            }
            console.log('stop wheel Update ')
        }

        // add buttons
        popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 400, -321 + yOffset);
        popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['exitButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});
        popup['exitButton'].button.setVisible(false);
        popup.addButton('okButton','long_button', 'long_button_hover', false, 0, 490 + yOffset);
        popup['okButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['okButton'].clickEvent.add(()=>{spinWheel();});

        // add button text
        popup.okText = popup.scene.add.bitmapText(0, 485 + yOffset, 'gameFont_0', 'Spin', 55, 1).setOrigin(0.5).setOrigin(0.5).setTint(0xe6fbfc,0xe6fbfc, 0xf3a9f3, 0xf3a9f3);
        popup.add(popup.okText);

        popup.scene.updateEvent.add(update, this);
        popup.closeEvent.add(closeHandler, this);
    },
    
    // not used 
    showWheelPU_6: function(scene)
    {
        scene.soundController.playClip('win_clip', false);
        scene.guiController.showPopUp(slotConfig.createWheelGamePUHandler_6); 
    },
}

class AnimatedCoinParticle extends Phaser.GameObjects.Particles.Particle
{
    constructor (emitter)
    {
        super(emitter);

        this.t = 0;
        this.i = 0;
        this.framesCount = 6;
    }
	
    update (delta, step, processors)
    {
        var result = super.update(delta, step, processors);
        this.t += delta;

        if (this.t >= coinSpinAnim.msPerFrame)
        {
            this.i++;
            if (this.i > this.framesCount-1)
            {
                this.i = 0;
            }
            this.frame = coinSpinAnim.frames[this.i].frame;
            this.t -= coinSpinAnim.msPerFrame;
        }
        return result;
    }
}

class ProgressSlider
{
    constructor(scene, baseLocPosX, baseLocPosY, baseSprite, fillLocPosX, fillLocPosY, fillSprite, spotSprite, depth)
    {
        this.fillAmount = 0;
        this.scene = scene;
        this.fillLocPosX = fillLocPosX;
        this.fillLocPosY = fillLocPosY;
        this.baseSprite = scene.addSpriteLocPos(baseSprite, baseLocPosX, baseLocPosY); 
        this.baseSprite.setDepth(depth);
        this.fillSprite = scene.addSpriteLocPos(fillSprite, fillLocPosX, fillLocPosY); 
        this.fillSprite.setDepth(depth + 1);

        this.sizeX = this.fillSprite.width;
        this.sizeY = this.fillSprite.height;
        // console.log('mask sizeX: ' + sizeX  + ' ;mask sizeY: ' + sizeY);

        this.spotSprite = scene.addSpriteLocPos(spotSprite, fillLocPosX - this.sizeX / 2, fillLocPosY); 
        this.spotSprite.setDepth(depth + 2);

        this.shapePosX = scene.centerX + fillLocPosX - this.sizeX / 2;
        this.shapePosY = scene.centerY + fillLocPosY + this.sizeY / 2;
        this.shape = scene.add.graphics();
        this.shape.fillStyle(0xffffff);
        this.shape.beginPath();
        this.shape.fillRect(this.shapePosX, this.shapePosY, this.sizeX, -this.sizeY);
        this.shape.depth = depth + 2;
        this.shape.setVisible(false);

        this.gMask = this.shape.createGeometryMask();
        this.fillSprite.setMask(this.gMask);   

        this.setFillAmount(this.fillAmount);
    }

    setFillAmount(amount)
    {
        if(amount > 1) amount = 1;
        if(amount < 0) amount = 0;
        this.fillAmount = amount;
        var _sizeX = this.sizeX * amount;
        this.shape.clear();
        this.shape.fillRect(this.shapePosX, this.shapePosY, _sizeX, -this.sizeY);  
        this.spotSprite.setPosition(this.shapePosX +_sizeX, this.scene.centerY + this.fillLocPosY);
        this.spotSprite.setVisible(this.fillAmount > 0);
    }
}

class SimulateSpins
{
    constructor(scene, repeat)
    {
        this.scene = scene;
        this.simIndex = 0;
        this.repeat = repeat;
        this.reels_simulations = [ 
            [0, 0, -1, -1, -1],                 // simulation #0, -1 avoid reel simulate
            [-1, -1, -1, -1, -1],               // simulation #1, full random
            [7, 5, 2, 0, 2],                    // simulation #2, JP win
            [-1, -1, -1, -1, -1],               // simulation #3, full random
            [9, 10, 7, 3, 1],                   // simulation #4,  5 scatter win 
            [-1, -1, -1, -1, -1],               // simulation #5, full random
            [4, 11, 11, 5, 10],                 // simulation #6, max win
            [-1, -1, -1, -1, -1],               // simulation #7, full random
            [-1, -1, -1, -1, -1],               // simulation #8, full random
        ];

        this.scene.endWinCalcEvent.add(()=>{
            if(this.reels_simulations.length > 0){
                this.simIndex++;
                if(this.simIndex >= this.reels_simulations.length) this.simIndex = (this.repeat) ? 0 : this.reels_simulations.length - 1;
            }
        }, this);    
        console.log('-!WARNING - SIMULATION MODE!-');
    }

    getSimulation()
    {
        console.log('simulation index: ' + this.simIndex);
        return (this.reels_simulations.length > 0) ? this.reels_simulations[this.simIndex] : null;       
    }
}