// pirates V2 3x5 243 lines (RTP: around 85%)
// phaser 3.88.2
var slotConfig3x5 = {

    symbolSizeY: 250, 
    spinTime: 2000,                 // time, milliseconds
    winShowTime: 3000,              // time, milliseconds
    showWinCoinsMessage : false,    // displaying a message with the amount of money won
    winMessageTime: 2000,           // win message show time
    minWin : 1000,                     // to show big, mega, huge popup
    useBigWinCongratulation : true,    // to show big, mega, huge popup
    showWinFreeSpinsMessage : true,    // show free spin message
    showFreeGameMessage : true,

    symbAnimFrameRate: 24,      // symbols animation frame rate
    frameWidth : 281,           // frame width
    frameHeight : 281,          // frame height

    playSpinSound: false,

    lineColor : 0xFFEA31,       // line color
    showWinLines : false,

    lineBetMaxValue: 20,        // slot line bet maxvalue
    useWild: true,              // use wild flag, wild can be substitute for any symbol to create winning combinations (exclude first reel)
    wild: 'Wild',               // wild symbol name
    useScatter: true,           // use scatter flag
    scatter: 'Scatter',         // scatter symbol name
    selectedLines: 'all',       //'all' / 'first' - selectad lines at start

    useWildInFirstPosition: false,              // substitute of the first symbol not allowed
    useLineBetMultiplier: true,                 // win multiplied by bet
    useLineBetFreeSpinMultiplier: false,        // free spins win multiplied by bet
    defaultCoins: 100000,                       // default player credit 100 000

    localOffsetX: 0,                            // x offset from center for all scene objects
    localOffsetY: 70,                           // y offset from center for all scene objects

    maxHold: 2,                                 // the maximum number of slot reels that can be held
    
    fonts: [
        /*
        {
            fontName: 'gameFont_0',
            filePNG:  'fonts/*.png',
            fileXML:  'fonts/*.xml'
        },
        */
        {
            fontName: 'gameFont_1',
            filePNG:  'fonts/DosisEB_64_0.png',
            fileXML:  'fonts/DosisEB_64_0.xml'
        },
        {
            fontName: 'gameFont_2',
            filePNG:  'fonts/DosisEB_64_2.png',
            fileXML:  'fonts/DosisEB_64_2.xml'
        },
        {
            fontName: 'gameFont_3',
            filePNG:  'fonts/DosisEB_64_1.png',
            fileXML:  'fonts/DosisEB_64_1.xml'
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
            fileName: 'ReelHolderTop.png',
            name: 'reelholdertop'
        },
        {
            fileName: 'ReelHolderBot.png',
            name: 'reelholderbot'
        },
        {
            fileName: 'Lantern.png',
            name: 'lantern'
        },
        {
            fileName: 'JPPanel.png',
            name: 'paneljackpot'
        },
        {
            fileName: null,
            name: 'handle'
        },
        {
            fileName: null,
            name: 'handle_ball'
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
            name: 'panel_menu'
        },
        {
            fileName: null,
            name: 'button_lines'
        },
        {
            fileName: null,
            name: 'button_lines_hover'
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
            fileName: null,
            name: 'line_button'
        },
        {
            fileName: null,
            name: 'line_button_hover'
        },
        {
            fileName: 'ButtonHold.png',
            name: 'button_hold'
        },
        {
            fileName: 'ButtonHoldOn.png',
            name: 'button_hold_on'
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
            fileName: null,
            name: 'about_title'
        }, 
        {
            fileName: 'gui/SettingsPanel.png',
            name: 'settings_panel'
        }, 
        {
            fileName: null,
            name: 'freespin_panel'
        }, 
        {
            fileName: 'gui/FreeSpinTitle.png',
            name: 'freespin_title'
        },
        {
            fileName: 'gui/BigWinPanel.png',
            name: 'bigwin_panel'
        }, 
        {
            fileName: null,
            name: 'bigwin_title'
        }, 
        {
            fileName: 'gui/HugeWinPanel.png',
            name: 'hugewin_panel'
        }, 
        {
            fileName: null,
            name: 'hugewin_title'
        },
        {
            fileName: 'gui/MegaWinPanel.png',
            name: 'megawin_panel'
        }, 
        {
            fileName: null,
            name: 'megawin_title'
        },
        {
            fileName: 'gui/SettingsTitle.png',
            name: 'settings_title'
        },
        {
            fileName: 'gui/HelpTitle.png',
            name: 'help_title'
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
            fileName: 'gui/RulesTitle.png',
            name: 'rules_title'
        },
        {
            fileName: 'gui/SpecialTitle.png',
            name: 'special_title'
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
            fileName: 'gui/MiddleButton.png', 
            name: 'middle_button'
        }, 
        {
            fileName: 'gui/MiddleButtonHover.png', 
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
            fileName: 'gui/JackpotWinPanel.png', 
            name: 'jackpotwin_panel'
        },   
        {
            fileName: null, 
            name: 'jackpotwin_title'
        }, 
        {
            fileName: null, 
            name: 'pu_background'
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
            fileName: 'gui/PopUpFlag.png', 
            name: 'popup_flag'
        },   
        {
            fileName: 'gui/SoundOn.png', 
            name: 'soundon'
        },  
        {
            fileName: 'gui/SoundOff.png', 
            name: 'soundoff'
        }, 
        {
            fileName: 'gui/MusicOn.png', 
            name: 'musicon'
        }, 
        {
            fileName: 'gui/MusicOff.png', 
            name: 'musicoff'
        }, 
        {
            fileName: 'gui/Bomb.png', 
            name: 'gui_bomb'
        }, 
        {
            fileName: 'gui/GiftBoxOpened.png', 
            name: 'giftbox_opened'
        }, 
        {
            fileName: 'gui/GiftBoxClosed.png', 
            name: 'giftbox_closed'
        }, 
        {
            fileName: 'gui/BoxSpot.png', 
            name: 'box_spot'
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
            fileName: 'Smoke.png',                      // filename or null
            name: 'Smoke',                              // sprite name
            fileNameBlurred: 'SmokeBlurred.png',        // blurry symbol file name, folder png/SymbolsBlurred
            animation: 'SmokeSheet.png',                // animation sheet file name, folder png/SymbolsSheet
            hideWinSymbol: true,                        // temporary hide the win symbol during the win animation
            useWildSubstitute: true                     // use wild substitute for the symbol
        },
        {
            fileName: 'Spyglass.png',           
            name: 'Spyglass',                   
            fileNameBlurred: 'SpyglassBlurred.png', 
            animation: 'SpyglassSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Saber.png',           
            name: 'Saber',                   
            fileNameBlurred: 'SaberBlurred.png', 
            animation: 'SaberSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Peaks.png',          
            name: 'Peaks',                   
            fileNameBlurred: 'PeaksBlurred.png', 
            animation: 'PeaksSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Bag.png',          
            name: 'Bag',                   
            fileNameBlurred: 'BagBlurred.png', 
            animation: 'BagSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Pistol.png',          
            name: 'Pistol',                   
            fileNameBlurred: 'PistolBlurred.png', 
            animation: 'PistolSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Cross.png',          
            name: 'Cross',                   
            fileNameBlurred: 'CrossBlurred.png', 
            animation: 'CrossSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Hearts.png',          
            name: 'Hearts',                   
            fileNameBlurred: 'HeartsBlurred.png', 
            animation: 'HeartsSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: true
        },
        {
            fileName: 'Diamonds.png',          
            name: 'Diamonds',                   
            fileNameBlurred: 'DiamondsBlurred.png', 
            animation: 'DiamondsSheet.png',
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
        {
            fileName: 'Jackpot.png',          
            name: 'Jackpot',                   
            fileNameBlurred: 'JackpotBlurred.png', 
            animation: 'JackpotSheet.png',
            hideWinSymbol: true,
            useWildSubstitute: false
        }
    ],

    reels:[
        {//0
            symbolImages: ['Diamonds', 'Peaks', 'Spyglass', 'Peaks', 'Saber', 'Cross', 'Pistol', 'Bag', 'Cross', 'Peaks', 'Smoke', 'Hearts', 'Jackpot', 'Scatter', 'Jackpot', 'Diamonds', 'Cross', 'Peaks'], 
            offsetX: -492,
            offsetY: -132+23,
            windowImage: 'reel',    // not used
            windowsCount: 3,    
            addSpinTime: 0, // additional spin time for reel milliseconds   
        },
        {//1
            symbolImages: ['Saber', 'Wild', 'Pistol', 'Smoke', 'Wild', 'Bag', 'Cross', 'Wild', 'Spyglass', 'Scatter', 'Wild', 'Diamonds', 'Hearts', 'Peaks', 'Wild', 'Peaks', 'Wild'], 
            offsetX: -246,
            offsetY: -132+23,
            windowImage: 'reel',        // not used
            windowsCount: 3,    
            addSpinTime: 100, // additional spin time for reel milliseconds   
        },
        { // 2
            symbolImages: ['Saber', 'Smoke', 'Pistol', 'Wild', 'Bag', 'Cross', 'Diamonds', 'Spyglass', 'Diamonds', 'Hearts', 'Peaks', 'Jackpot', 'Scatter', 'Jackpot', 'Wild', 'Peaks', 'Wild', 'Diamonds', 'Cross', 'Cross'],
            offsetX: 0,
            offsetY: -132+23,
            windowImage: 'reel',        // not used
            windowsCount: 3,
            addSpinTime: 200, // additional spin time for reel milliseconds   
        },
        { // 3
            symbolImages: ['Pistol', 'Wild', 'Bag', 'Cross', 'Spyglass', 'Saber', 'Peaks', 'Diamonds', 'Hearts', 'Smoke', 'Peaks', 'Scatter', 'Diamonds', 'Peaks', 'Diamonds', 'Peaks', 'Peaks', 'Wild'],
            offsetX: 246,
            offsetY: -132+23,
            windowImage: 'reel',        // not used
            windowsCount: 3,
            addSpinTime: 300, // additional spin time for reel milliseconds     
        },
        { // 4
            symbolImages: ['Smoke', 'Wild', 'Saber', 'Pistol', 'Spyglass', 'Bag', 'Cross', 'Diamonds', 'Hearts', 'Peaks', 'Jackpot', 'Scatter', 'Jackpot', 'Diamonds', 'Wild', 'Diamonds', 'Peaks'],
            offsetX: 492,
            offsetY: -132+23,
            windowImage: 'reel',        // not used
            windowsCount: 3,
            addSpinTime: 400, // additional spin time for reel milliseconds     
        }
    ],
   
/*
    lines: [                    // predefined  slot lines positions 0 - most bottom window on reels
        [1, 1, 1, 1, 1],  // line 0 
        [2, 2, 2, 2, 2],  // line 1 
        [0, 0, 0, 0, 0],  // line 2
        [2, 1, 0, 1, 2],  // line 3
        [0, 1, 2, 1, 0],  // line 4
        [1, 2, 1, 2, 1],  // line 5
        [1, 0, 1, 0, 1],  // line 6
        [2, 2, 1, 0, 0],  // line 7
        [0, 0, 1, 2, 2],  // line 8
        [1, 0, 1, 2, 1],  // line 9

        [1, 2, 1, 0, 1],  // line 10
        [1, 0, 0, 0, 1],  // line 11
        [0, 1, 1, 1, 0],  // line 12
        [2, 1, 2, 1, 2],  // line 13
        [0, 1, 0, 1, 0],  // line 14
        [1, 1, 2, 1, 1],  // line 15
        [1, 1, 0, 1, 1],  // line 16
        [2, 2, 0, 2, 2],  // line 17
        [0, 0, 2, 0, 0],  // line 18
        [2, 0, 0, 0, 2]   // line 19
    ],
*/

    payLines:[
        {
            line: ['Smoke', 'Smoke', 'Smoke', 'Smoke', 'Smoke'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Smoke', 'Smoke', 'Smoke', 'Smoke', 'any'],
            pay: 2,
            freeSpins: 0
        },
        {
            line: ['Smoke', 'Smoke', 'Smoke', 'any', 'any'],
            pay: 1,
            freeSpins: 0
        },
        {
            line: ['Spyglass', 'Spyglass', 'Spyglass', 'Spyglass', 'Spyglass'],
            pay: 5,
            freeSpins: 0
        },
        {
            line: ['Spyglass', 'Spyglass', 'Spyglass', 'Spyglass', 'any'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Spyglass', 'Spyglass', 'Spyglass', 'any', 'any'],
            pay: 1,
            freeSpins: 0
        },
        {
            line: ['Saber', 'Saber', 'Saber', 'Saber', 'Saber'],
            pay: 6,
            freeSpins: 0
        },
        {
            line: ['Saber', 'Saber', 'Saber', 'Saber', 'any'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Saber', 'Saber', 'Saber', 'any', 'any'],
            pay: 2,
            freeSpins: 0
        },
        {
            line: ['Pistol', 'Pistol', 'Pistol', 'Pistol', 'Pistol'],
            pay: 7,
            freeSpins: 0
        },
        {
            line: ['Pistol', 'Pistol', 'Pistol', 'Pistol', 'any'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Pistol', 'Pistol', 'Pistol', 'any', 'any'],
            pay: 2,
            freeSpins: 0
        },
        {
            line: ['Bag', 'Bag', 'Bag', 'Bag', 'Bag'],
            pay: 8,
            freeSpins: 0
        },
        {
            line: ['Bag', 'Bag', 'Bag', 'Bag', 'any'],
            pay: 3,
            freeSpins: 0
        },
        {
            line: ['Bag', 'Bag', 'Bag', 'any', 'any'],
            pay: 2,
            freeSpins: 0
        },
        {
            line: ['Cross', 'Cross', 'Cross', 'Cross', 'Cross'],
            pay: 17,
            freeSpins: 0
        },
        {
            line: ['Cross', 'Cross', 'Cross', 'Cross', 'any'],
            pay: 13,
            freeSpins: 0
        },
        {
            line: ['Cross', 'Cross', 'Cross', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
        {
            line: ['Diamonds', 'Diamonds', 'Diamonds', 'Diamonds', 'Diamonds'],
            pay: 19,
            freeSpins: 0
        },
        {
            line: ['Diamonds', 'Diamonds', 'Diamonds', 'Diamonds', 'any'],
            pay: 13,
            freeSpins: 0
        },
        {
            line: ['Diamonds', 'Diamonds', 'Diamonds', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
        {
            line: ['Hearts', 'Hearts', 'Hearts', 'Hearts', 'Hearts'],
            pay: 20,
            freeSpins: 0
        },
        {
            line: ['Hearts', 'Hearts', 'Hearts', 'Hearts', 'any'],
            pay: 14,
            freeSpins: 0
        },
        {
            line: ['Hearts', 'Hearts', 'Hearts', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
        {
            line: ['Peaks', 'Peaks', 'Peaks', 'Peaks', 'Peaks'],
            pay: 25,
            freeSpins: 0
        },
        {
            line: ['Peaks', 'Peaks', 'Peaks', 'Peaks', 'any'],
            pay: 15,
            freeSpins: 0
        },
        {
            line: ['Peaks', 'Peaks', 'Peaks', 'any', 'any'],
            pay: 11,
            freeSpins: 0
        },
    ],
    
    scatterPayTable:[
        {
            scattersCount: 5,
            pay: 0,
            freeSpins: 5,
            winEventString: null // 'slotConfig.showWheelPU_6' // this method will be called when winnings are shown (slotGame-> *winShowC) - wheel mini-game
        }
    ],
    
    // jackpot settings
    jackpot:
        {
            symbolName: 'Jackpot',
            symbolsCount: 6,
            defaultAmount: 1000,        // coins amout at start
            increaseValue: 1,           // jackpot increment after spin
        },

    createSlotGraphic: function(scene){
/*
        scene.debugreference =  scene.addSpriteLocPos('debugreference', 0, -70); //?.setScale(1.5);
        scene.debugreference.depth = 2000;
        scene.debugreference.setAlpha(0.0);
*/

        scene.slot =  scene.addSpriteLocPos('slot', 0, -133 + 23); 
        scene.slot.depth = -1;

        scene.reelholdertop =  scene.addSpriteLocPos('reelholdertop', 0, -545+23+3);  
        scene.reelholderbot =  scene.addSpriteLocPos('reelholderbot', 0, 260+23-16);   
        scene.paneljackpot =  scene.addSpriteLocPos('paneljackpot', 0, -545);  

        scene.lanternleft =  scene.addSpriteLocPos('lantern', -680, -483 + 23).setOrigin(0.5, 0.05); 
        scene.lanternright =  scene.addSpriteLocPos('lantern', 695, -483 + 23).setOrigin(0.5, 0.05);   
    },

    createReels: function(scene) {
        var _reels = [];
        for(var ri = 0; ri < this.reels.length; ri++)
        {
            _reels.push(new Reel(scene, this.reels[ri], ri, this.symbolSizeY, this.reels[ri].windowsCount, true, this.spinTime, this.symbAnimFrameRate));
            _reels[ri].scaleMaskAndOffset(1, 1, 0, 0);     // minor mask correction (xScale, yScale, xOffset, yOffset)
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
         var lB = new LineButton(scene, 'line_button', 'line_button_hover', this.lineButtonsLeftOrder[i]);
         lineButtons.push(lB); 
         lB.create(-680,  -455 + 71 * i, 0.5, 0.6, 'gameFont_0', 32);
         lB.lineText.y-=7;
        }

        for(var i = 0; i < this.lineButtonsRightOrder.length; i++)
        {
            var lB = new LineButton(scene, 'line_button', 'line_button_hover', this.lineButtonsRightOrder[i]);
            lineButtons.push(lB); 
            lB.create(680, -455 + 71 * i, 0.5, 0.6, 'gameFont_0', 32);
            lB.button.setScale(-1, 1);
            lB.lineText.y-=7;
        }

     lineButtons.sort((a, b) => a.number - b.number);
     return lineButtons;
    },
*/

    createControls: function(scene, slotControls) {
        let depth = 11;

        slotControls.spinTextString = 'Spin';
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

        // panels
        slotControls.linesPanel = addSprite('panel_lines', -610, 210 + 220, depth); 
        slotControls.totalbetPanel = addSprite('panel_totalbet', -380, 210 + 220, depth);
        slotControls.balancePanel = addSprite('panel_balance', 380, 210 + 220, depth); 
        slotControls.winPanel = addSprite('panel_win', 612, 210 + 220, depth); 
        // slotControls.menuPanel = addSprite('panel_menu', -730, -230, depth); 
        // slotControls.menuPanel.setVisible(false);

        // maxbet button
        slotControls.slotMaxBetButton = addButton('button_maxbet', 'button_maxbet_hover', false, -173, 210 + 200, 0.5, 0.5, depth);   
        slotControls.slotMaxBetButton.addClickEvent(slotControls.maxBet_Click, slotControls);     
               
        // autoSpin button
        slotControls.slotAutoSpinButton = addButton('button_autospin', 'button_autospin_hover', true, 173, 210 + 200, 0.5, 0.5, depth); 
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
        slotControls.slotSpinButton.create(0, 210 + 200, 0.5, 0.5);    
        slotControls.slotSpinButton.clickEvent.add(scene.handleAnimation, scene);  
        slotControls.slotSpinButton.setDepth(depth); 

        // menu button
        slotControls.menuButton = addButton('button_menu', 'button_menu_hover', true, -770, -358, 0.5, 0.5, depth);   
        slotControls.menuButton.addClickEvent(()=>{ 
            console.log('menu click');
            slotControls.settingsButton.button.setVisible(!slotControls.settingsButton.button.visible);  
            slotControls.rulesButton.button.setVisible(!slotControls.rulesButton.button.visible); 
            slotControls.slotInfoButton.button.setVisible(!slotControls.slotInfoButton.button.visible); 
            // slotControls.menuPanel.setVisible(!slotControls.menuPanel.visible); 
            scene.soundController.playClip('button_click');}, this);
        slotControls.menuButton.button.setVisible(true); 

        // settings button
        slotControls.settingsButton = addButton('button_settings', 'button_settings_hover', false, -770, -255, 0.5, 0.5, depth);   
        slotControls.settingsButton.addClickEvent(()=>{ 
            console.log('settings click');
            var pu = scene.guiController.showPopUp(this.createSettingsPUHandler);
            scene.soundController.playClip('button_click');}, this);
        slotControls.settingsButton.button.setVisible(false);  

       // rules button
       slotControls.rulesButton = addButton('button_rules', 'button_rules_hover', false, -770, -150, 0.5, 0.5, depth);   
       slotControls.rulesButton.addClickEvent(()=>{
           var pu = scene.guiController.showPopUp(this.createInfoPUHandler);
           scene.soundController.playClip('button_click');
       }, this);   
       slotControls.rulesButton.button.setVisible(false); 

       // info button
       slotControls.slotInfoButton = addButton('button_info', 'button_info_hover', false, -770, -45, 0.5, 0.5, depth);   
       slotControls.slotInfoButton.addClickEvent(()=>{
            console.log('info click');
           var pu = scene.guiController.showPopUp(this.createAboutPUHandler);
           scene.soundController.playClip('button_click');
       }, this);   
       slotControls.slotInfoButton.button.setVisible(false); 

        // totalbet minus button
        slotControls.totalBetMinusButton = addButton('button_minus','button_minus_hover', false, -380-82, 212 + 220, 0.5, 0.5, depth);   
        slotControls.totalBetMinusButton.addClickEvent(slotControls.lineBetMinus_Click, slotControls);
        
        // totalbet plus button
        slotControls.totalBetPlusButton = addButton('button_plus','button_plus_hover', false, -380 + 82, 212 + 220, 0.5, 0.5, depth);   
        slotControls.totalBetPlusButton.addClickEvent(slotControls.lineBetPlus_Click, slotControls);

        // sound button
        //slotControls.soundButton = addButton('button_on', 'button_off', true, -860, -300, 0.5, 0.5, depth);   
        //slotControls.soundButton.addClickEvent(()=>{scene.soundController.soundOn(!scene.soundController._soundOn);}, scene);

        // lines loop button - not used
        // slotControls.slotLinesLoopButton = addButton('button_lines', 'button_lines_hover', false, -700, 212 + 220, 0.5, 0.5, depth);   
        // slotControls.slotLinesLoopButton.addClickEvent(slotControls.linesLoop_Click, slotControls);

        // lines minus button - not used
        // slotControls.linesMinusButton = addButton('button_minus','button_minus_hover', false, -610-68, 212 + 220, 0.5, 0.5, depth);   
        // slotControls.linesMinusButton.addClickEvent(slotControls.linesMinus_Click, slotControls);
         
        // lines plus button - not used
        // slotControls.linesPlusButton = addButton('button_plus','button_plus_hover', false, -610 + 68, 212 + 220, 0.5, 0.5, depth);   
        // slotControls.linesPlusButton.addClickEvent(slotControls.linesPlus_Click, slotControls);


        // adding the text fields
        slotControls.linesText = scene.add.bitmapText(scene.centerX - 610, scene.centerY + 145 + 220, 'gameFont_2', 'LINES', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.linesCountText = scene.add.bitmapText(scene.centerX - 610, scene.centerY + 210 + 220, 'gameFont_1', slotControls.selectedLinesCount, 42, 1).setOrigin(0.5).setDepth(depth);

        slotControls.lineBetAmountText = scene.add.bitmapText(scene.centerX - 442, scene.centerY + 125 + 220, 'gameFont_1', slotControls.lineBet, 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.lineBetAmountText.setVisible(false);
 
        slotControls.totalBetText = scene.add.bitmapText(scene.centerX - 380, scene.centerY + 145 + 220, 'gameFont_2', 'TOTAL  BET', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.totalBetSumText = scene.add.bitmapText(scene.centerX - 380, scene.centerY + 210 + 220, 'gameFont_1', slotControls.getTotalBet(), 42, 1).setOrigin(0.5).setDepth(depth);
 
        slotControls.creditText = scene.add.bitmapText(scene.centerX + 380, scene.centerY + 145 + 220, 'gameFont_2', 'BALANCE', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.creditSumText = scene.add.bitmapText(scene.centerX + 380, scene.centerY + 210 + 220, 'gameFont_1', '' + scene.slotPlayer.coins, 42, 1).setOrigin(0.5).setDepth(depth);
         
        slotControls.winText = scene.add.bitmapText(scene.centerX + 612, scene.centerY + 145 + 220, 'gameFont_2', 'YOUR  WIN', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.winAmountText = scene.add.bitmapText(scene.centerX + 612, scene.centerY + 210 + 220, 'gameFont_1', '0', 42, 1).setOrigin(0.5).setDepth(depth);

        slotControls.jackpotAmountText = scene.add.bitmapText(scene.centerX + 0, scene.centerY - 540, 'gameFont_1', '0', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.jackpotAmountText.setVisible(true);

        slotControls.autoSpinText = scene.add.bitmapText(scene.centerX + 173, scene.centerY + 187 + 200, 'gameFont_3', 'AUTO', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.autoSpinText.setLetterSpacing(-5);
        slotControls.autoSpinText1 = scene.add.bitmapText(scene.centerX + 173, scene.centerY + 221 + 200, 'gameFont_3', 'SPIN', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.autoSpinText1.setLetterSpacing(-1);

        slotControls.maxBetText = scene.add.bitmapText(scene.centerX - 173, scene.centerY + 187 + 200, 'gameFont_3', 'MAX', 42, 1).setOrigin(0.5).setDepth(depth);
        slotControls.maxBetText.setLetterSpacing(-2);
        slotControls.maxBetText1 = scene.add.bitmapText(scene.centerX - 173, scene.centerY + 221 + 200, 'gameFont_3', 'BET', 42, 1).setOrigin(0.5).setDepth(depth);
        
        slotControls.spinText = scene.add.bitmapText(scene.centerX - 0, scene.centerY + 198 + 200, 'gameFont_3', 'Spin', 80, 1).setOrigin(0.5).setDepth(depth);

        slotControls.infoText = scene.add.bitmapText(scene.centerX, scene.centerY + 400 + 200, 'gameFont_3', 'info', 30, 1).setOrigin(0.5).setDepth(depth);
        slotControls.infoText.setVisible(false);

        slotControls.freeSpinCountText = scene.add.bitmapText(scene.centerX, scene.centerY + 400 + 200, 'gameFont_3', '99', 130, 1).setOrigin(0.5).setDepth(depth); // not used
        slotControls.freeSpinCountText.setVisible(false);

        // hold feature
        /* */
        slotControls.holdButtons = [];
        for(var ri = 0; ri < this.reels.length; ri++)
        {
            var butt = 'holdButton' + ri;
            slotControls[butt] = addButton('button_hold', 'button_hold_on', true, -492 + ri*246, 290, 0.5, 0.5, depth);   
            slotControls.holdButtons.push(slotControls[butt]);
            slotControls[butt].button.setVisible(true); 
            slotControls[butt].reelNumber = ri;
        }   

        slotControls.holdMultiplierTextL = scene.add.bitmapText(scene.centerX - 685, scene.centerY - 130, 'gameFont_2', 'x 1', 100, 1).setOrigin(0.5).setDepth(depth);       // left side text
        slotControls.holdMultiplierTextL.setVisible(true);
        slotControls.holdMultiplierTextR = scene.add.bitmapText(scene.centerX + 685, scene.centerY - 130, 'gameFont_2', 'x 1', 100, 1).setOrigin(0.5).setDepth(depth);       // right side text
        slotControls.holdMultiplierTextR.setVisible(true);

        slotControls.hold = new HoldFeature(scene, slotControls.holdButtons, this.maxHold); // create hold feature

       // slotControls.simulateSpins = new SimulateSpins(scene, true);  // it true -> repeat, else -> clamp
    },
   
    createInfoPUHandler: function(popup)
    {
        function createSymbolPlate5x (popup, parentContainer, symbSpriteName, posX, posY, price3x, price4x, price5x)
        {
            let symbContainer = popup.scene.add.container(posX, posY);
            parentContainer.add(symbContainer);
            let symbIcon = popup.scene.add.sprite(-140, 0, symbSpriteName).setOrigin(0.5).setScale(0.8);
            symbContainer.add(symbIcon);
    
            let textXPos = -20;
            let text3x = popup.scene.add.bitmapText(textXPos, 48, 'gameFont_1', '3X', 50, 1).setOrigin(0, 0.5);
            text3x.tint = 0x4f312d;
            symbContainer.add(text3x);
            let text3x1 = popup.scene.add.bitmapText(textXPos + 55, 48, 'gameFont_1', '- ' + price3x, 50, 1).setOrigin(0, 0.5);
            text3x1.tint = 0xda3b0b;
            symbContainer.add(text3x1);
    
            let text4x = popup.scene.add.bitmapText(textXPos, 0, 'gameFont_1', '4X', 50, 1).setOrigin(0, 0.5);
            text4x.tint = 0x4f312d;
            symbContainer.add(text4x);
            let text4x1 = popup.scene.add.bitmapText(textXPos + 55, 0, 'gameFont_1', '- ' + price4x, 50, 1).setOrigin(0, 0.5);
            text4x1.tint = 0xda3b0b;
            symbContainer.add(text4x1);

            let text5x = popup.scene.add.bitmapText(textXPos, -48, 'gameFont_1', '5X', 50, 1).setOrigin(0, 0.5);
            text5x.tint = 0x4f312d;
            symbContainer.add(text5x);
            let text5x1 = popup.scene.add.bitmapText(textXPos + 55, -48, 'gameFont_1', '- ' + price5x, 50, 1).setOrigin(0, 0.5);
            text5x1.tint = 0xda3b0b;
            symbContainer.add(text5x1);
        };

        function createSpecSymbolPlate(popup, parentContainer, symbSpriteName, posX, posY, info)
        {
            let symbContainer = popup.scene.add.container(posX, posY);
            parentContainer.add(symbContainer);
            let symbIcon = popup.scene.add.sprite(0, 0, symbSpriteName).setOrigin(0.5, 0.5).setScale(0.7);
            symbContainer.add(symbIcon);
    
            let textInfo = popup.scene.add.bitmapText(120, 0, 'gameFont_1', info, 48, 0).setOrigin(0, 0.5);
            textInfo.tint = 0x4f312d;
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
        };

        let index = 0;
        let containers = [];
        let selectors = [];
        let offsetY = 20;

        // add background and panel
        let backGround = popup.scene.add.sprite(0, -90 + offsetY, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        // backGround.setAlpha(0.05);
        backGround.tint = 0x3c3c3c;
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, 22 + offsetY, 'info_panel').setOrigin(0.5);
        popup.add(panel);

        let title = popup.scene.add.sprite(0, -410 + offsetY, 'help_title').setOrigin(0.5);
        popup.add(title);

        popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 370, -450 + offsetY);
        popup.addButton('nextButton','next_button', 'next_button_hover', false, 730, -20 + offsetY);
        popup.addButton('prevButton','prev_button', 'prev_button_hover', false, -730, -20 + offsetY);
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

        // create minor symbols panel
        let minorContainer = popup.scene.add.container(0, 0 + offsetY);
        containers.push(minorContainer);
        popup.add(minorContainer);
        let minorTitle =  popup.scene.add.sprite(0, -410, 'minor_title').setOrigin(0.5); // image
        //let minorTitle = popup.scene.add.bitmapText(0, -257, 'gameFont_2', 'Minor Symbols', 72, 1).setOrigin(0.5); // text
        minorContainer.add(minorTitle);

        let row1Y = -160;
        let row2Y = row1Y + 270;
        let col1X = -355;
        let colDist = 410;
        let col2X = col1X + colDist;
        let col3X = col2X + colDist;

        // minor row 1
        createSymbolPlate5x(popup, minorContainer, 'Smoke',  col1X , row1Y, 1, 2, 3);
        createSymbolPlate5x(popup, minorContainer, 'Spyglass', col2X , row1Y, 1, 3, 5);
        createSymbolPlate5x(popup, minorContainer, 'Saber', col3X , row1Y, 2, 3, 6);

        // minor row 2
        createSymbolPlate5x(popup, minorContainer, 'Pistol', col1X + 0.5 * colDist, row2Y, 2, 3, 7);
        createSymbolPlate5x(popup, minorContainer, 'Bag', col2X + 0.5 * colDist, row2Y, 2, 3, 8);
        minorContainer.visible = false;

        // create major symbols panel
        let majorContainer = popup.scene.add.container(0, 0 + offsetY);
        containers.push(majorContainer);
        popup.add(majorContainer);
        let majorTitle =  popup.scene.add.sprite(0, -410, 'major_title').setOrigin(0.5); // image
        // let majorTitle = popup.scene.add.bitmapText(0, -257, 'gameFont_2', 'Major  Symbols', 72, 1).setOrigin(0.5); // text
        majorContainer.add(majorTitle);

        // major row 1
        createSymbolPlate5x(popup, majorContainer , 'Cross', col1X + 0.5 * colDist, row1Y, 11, 13, 17);
        createSymbolPlate5x(popup, majorContainer , 'Diamonds', col2X + 0.5 * colDist, row1Y, 11, 13, 19);

        // major row 2
        createSymbolPlate5x(popup, majorContainer , 'Hearts', col1X + 0.5 * colDist, row2Y, 11, 14, 20);
        createSymbolPlate5x(popup, majorContainer , 'Peaks', col2X + 0.5 * colDist, row2Y, 11, 15, 25);
        majorContainer.visible = false;

        // create special symbols panel
        let specialContainer = popup.scene.add.container(0, 0 + offsetY);
        containers.push(specialContainer);
        popup.add(specialContainer);
        let specialTitle =  popup.scene.add.sprite(0, -410, 'special_title').setOrigin(0.5); // image
        // let specialTitle = popup.scene.add.bitmapText(0, -257, 'gameFont_2', 'Special  Symbols', 72, 1).setOrigin(0.5); // text
        specialContainer.add(specialTitle);
    
        // special row 1
        createSpecSymbolPlate(popup, specialContainer, 'Wild', -480, -200 -10, 'Wild can be used with any symbols on the reels to create \nwinning combinations (exclude first reel).');
        createSpecSymbolPlate(popup, specialContainer, 'Scatter', -480 , -15 -10, 'Any 5 scatter on the screen give the player 5 free spins.');
        createSpecSymbolPlate(popup, specialContainer, 'Jackpot', -480 , 170 -10, 'Any 6 jackot symbols scattered on the screen = Jackpot Win.');
        specialContainer.visible = false;

        // create rules panel
        let rulesContainer = popup.scene.add.container(0, 0 + offsetY);
        containers.push(rulesContainer);
        popup.add(rulesContainer);
        let rulesTitle =  popup.scene.add.sprite(0, -410, 'rules_title').setOrigin(0.5); // image
        // let rulesTitle = popup.scene.add.bitmapText(0, -257, 'gameFont_2', 'Rules', 72, 1).setOrigin(0.5); // text
        rulesContainer.add(rulesTitle);

        let aboutTitle = popup.scene.add.bitmapText(-620, -280, 'gameFont_1', 'About the game', 63, 0).setOrigin(0,0.5); // text
        rulesContainer.add(aboutTitle);
        aboutTitle.tint = 0xda3b0b;
        let aboutText = popup.scene.add.bitmapText(-620, -250, 'gameFont_1',
        'Pirates slot is a pack of Slot Games with 5 reels and 243 paylines oriented \nfrom left to right. The games have 9 regular symbols that win if three \nor  more  are  lined  up in sequence  on  a  payline, beginning  from the \nleftmost  position. The 4  high  pay symbols  and the 5 low pay symbols.', 50, 0).setOrigin(0, 0); // text
        aboutText.tint = 0x4f312d;
        rulesContainer.add(aboutText);


        let howTitle = popup.scene.add.bitmapText(-620, 10, 'gameFont_1', 'How to play', 63, 0).setOrigin(0,0.5); // text
        rulesContainer.add(howTitle);
        howTitle.tint = 0xda3b0b;
        let howText = popup.scene.add.bitmapText(-620, 40, 'gameFont_1',
        '- Place your bet \n- Press the Spin button to start game \n- You can also use Max Bet button to auto bet \n- Press the AutoSpin button to turn Auto Spin game mode', 50, 0).setOrigin(0, 0); // text
        howText.tint = 0x4f312d;
        rulesContainer.add(howText);

        // create navi selectors
        let dotDist = 50;
        let offsetDots = dotDist * (containers.length - 1) / 2;
        if(popup.scene.textures.exists('navi_dot_active') && popup.scene.textures.exists('navi_dot'))
        {
            for(let i = 0; i < containers.length; i++)
            {
                var selector = popup.scene.add.sprite(-offsetDots + i * dotDist, 440 + offsetY, 'navi_dot').setOrigin(0.5);
                selectors.push(selector);
                popup.add(selector);
            }
        }
        refreshInfoPu(containers, selectors, index);
    },

    createAboutPUHandler: function(popup)
    {     
        let yOffset = -70;
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        // backGround.setAlpha(0.05);
        popup.add(backGround);

        let flag = popup.scene.add.sprite(205, -80 + yOffset, 'popup_flag').setOrigin(0.5);
        popup.add(flag);
        let panel = popup.scene.add.sprite(0, 15 + yOffset, 'about_panel').setOrigin(0.5);
        popup.add(panel);

        // add title
        // let title = popup.scene.add.sprite(0, -305 + yOffset, 'about_title').setOrigin(0.5);
        // popup.add(title);

        // add logo
        let logo = popup.scene.add.sprite(0, -80 + yOffset, 'logo').setOrigin(0.5);
        popup.add(logo);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 80 + yOffset, 'gameFont_1', 'Need Help?', 43, 1).setOrigin(0.5);
        popup.messageText.tint = 0x4f312d;
        popup.add(popup.messageText);

        // add buttons
        popup.addButton('supportButton','long_button', 'long_button_hover', false, 0, 160 + yOffset);
        popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 185, -280  + yOffset);

        popup['supportButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['supportButton'].clickEvent.add(()=>{window.open("http://www.mkeystudio.com"); }, popup);
        
        popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['exitButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});

        // add support button text
        popup.supText = popup.scene.add.bitmapText(0, 153 + yOffset, 'gameFont_3', 'Support', 67, 1).setOrigin(0.5);
        popup.supText.tint = 0xFFFFFF;
        popup.add(popup.supText);
    },

    createSettingsPUHandler: function(popup)
    {    
        function refreshIcons (popup)
        {
            popup.soundIcon.setTexture( popup.scene.soundController._soundOn ? 'soundon' : 'soundoff');
            popup.musicIcon.setTexture( popup.scene.soundController._musicOn ? 'musicon' : 'musicoff');
            console.log('refresh');
        }

        let yOffset = -70;   
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0+ yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        // backGround.setAlpha(0.5);
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, 80 + yOffset, 'settings_panel').setOrigin(0.5);
        popup.add(panel);

        // add title
        let title = popup.scene.add.sprite(0, -300 + yOffset, 'settings_title').setOrigin(0.5);
        popup.add(title);

        popup.audioText = popup.scene.add.bitmapText(0, -180 + yOffset, 'gameFont_3', 'Audio', 80, 1).setOrigin(0.5);
        popup.audioText.tint = 0x4f312d;
        popup.add(popup.audioText);

        popup.agreeText = popup.scene.add.bitmapText(0, 10 + yOffset, 'gameFont_3', 'Agreement', 80, 1).setOrigin(0.5);
        popup.agreeText.tint = 0x4f312d;
        popup.add(popup.agreeText);

        // sound and music text
        // popup.soundText = popup.scene.add.bitmapText(-93, -178 + yOffset, 'gameFont_2', 'SOUNDS', 32, 1).setOrigin(0.5);
        // popup.soundText.tint = 0x4f2930;
        // popup.add(popup.soundText);

        // popup.musicText = popup.scene.add.bitmapText(93, -178 + yOffset, 'gameFont_2', 'MUSIC', 32, 1).setOrigin(0.5);
        // popup.musicText.tint = 0x4f2930;
        // popup.add(popup.musicText);

        // sound and music buttons
        popup.addButton('soundButton','button_on', 'button_off', true, -95, -97 + yOffset);
        popup.addButton('musicButton','button_on', 'button_off', true, 180, -97 + yOffset);

        popup['soundButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['soundButton'].clickEvent.add(()=>{popup.scene.soundController.soundOn(!popup.scene.soundController._soundOn);refreshIcons (popup);}, popup);
        if(!popup.scene.soundController._soundOn) popup['soundButton'].setPressed();

        popup['musicButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['musicButton'].clickEvent.add(()=>{popup.scene.soundController.musicOn(!popup.scene.soundController._musicOn); refreshIcons (popup);}, popup);
        if(!popup.scene.soundController._musicOn) popup['musicButton'].setPressed();

        popup.soundIcon = popup.scene.add.sprite(-220, -102 + yOffset, 'soundon').setOrigin(0.5);
        popup.add(popup.soundIcon);
        popup.musicIcon = popup.scene.add.sprite(60, -103 + yOffset, 'musicon').setOrigin(0.5);
        popup.add(popup.musicIcon);

        // privacy ant terms buttons
        popup.addButton('privacyButton','extralong_button', 'extralong_button_hover', false, 0, 230 + yOffset);
        popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 310, -340 + yOffset);
        popup.addButton('termsButton','extralong_button', 'extralong_button_hover', false, 0, 120 + yOffset);

        popup['privacyButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['privacyButton'].clickEvent.add(()=>{window.open("http://www.mkeystudio.com"); }, popup);
        
        popup['termsButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['termsButton'].clickEvent.add(()=>{window.open("http://www.mkeystudio.com"); }, popup);

        popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['exitButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});

        // privacy ant terms buttons text
        popup.privacyText = popup.scene.add.bitmapText(0, 218 + yOffset, 'gameFont_3', 'Privacy Policy', 57, 1).setOrigin(0.5);
        popup.privacyText.tint = 0xFFFFFF;
        popup.add(popup.privacyText);

        popup.termsText = popup.scene.add.bitmapText(0, 108 + yOffset, 'gameFont_3', 'Terms of Use', 57, 1).setOrigin(0.5);
        popup.privacyText.tint = 0xFFFFFF;
        popup.add(popup.termsText);

        popup.bomb = popup.scene.add.sprite(-230, 310 + yOffset, 'gui_bomb').setOrigin(0.5);
        popup.add(popup.bomb);

        refreshIcons (popup);
    },

    createFreeGamesPUHandler: function(popup)
    {
        let yOffset = -70;   
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        backGround.setAlpha(0.9);
        popup.add(backGround);

        //let panel = popup.scene.add.sprite(0, -20 + yOffset, 'freespin_panel').setOrigin(0.5);
        //popup.add(panel);

        let title = popup.scene.add.sprite(0, -0 + yOffset, 'freespin_title').setOrigin(0.5);
        popup.add(title);
        
        let box = popup.scene.add.sprite(0, -205 + yOffset, 'giftbox_opened').setOrigin(0.5);
        popup.add(box);
        let boxspot = popup.scene.add.sprite(15, -292 + yOffset, 'box_spot').setOrigin(0.5);
        popup.add(boxspot);

        // add caption
        //popup.captionText = popup.scene.add.bitmapText(0, -80, 'gameFont_2', 'START FREE GAME', 33, 1).setOrigin(0.5);
        //popup.captionText.tint = 0xFFFFFF;
        //popup.add(popup.captionText);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 90 + yOffset, 'gameFont_1', '0', 75, 1).setOrigin(0.5);
        popup.messageText.tint = 0xffd924;
        popup.add(popup.messageText);

        // add buttons
        popup.addButton('okButton','long_button', 'long_button_hover', false, 0, 200 + yOffset);
        popup['okButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
        popup['okButton'].clickEvent.add(()=>{popup.scene.guiController.closePopUp(popup);});
        // add button text
        popup.okText = popup.scene.add.bitmapText(0, 192 + yOffset, 'gameFont_1', 'Start', 67, 1).setOrigin(0.5);
        popup.okText.tint = 0xFFFFFF;
        popup.add(popup.okText);
    },

    createFreeSpinsWinPUHandler: function(popup)
    {
        let yOffset = -0;   
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        backGround.setAlpha(0.9);
        popup.add(backGround);

        //let panel = popup.scene.add.sprite(0, -20 + yOffset, 'freespin_panel').setOrigin(0.5);
        //popup.add(panel);

        let title = popup.scene.add.sprite(0, -0 + yOffset, 'freespin_title').setOrigin(0.5);
        popup.add(title);
        
        let box = popup.scene.add.sprite(0, -205 + yOffset, 'giftbox_opened').setOrigin(0.5);
        popup.add(box);
        let boxspot = popup.scene.add.sprite(15, -292 + yOffset, 'box_spot').setOrigin(0.5);
        popup.add(boxspot);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 90 + yOffset, 'gameFont_1', '0', 75, 1).setOrigin(0.5);
        popup.messageText.tint = 0xffd924;
        popup.add(popup.messageText);
    },

    createBigWinPUHandler: function(popup)
    {
        let yOffset = -100; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        backGround.setAlpha(0.9);
        popup.add(backGround);

        let panel = popup.scene.add.sprite(0, -17 + yOffset, 'bigwin_panel').setOrigin(0.5);
        popup.add(panel);
        // let title = popup.scene.add.sprite(0, -170 + yOffset, 'bigwin_title').setOrigin(0.5);
        // popup.add(title);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, 145 + yOffset, 'gameFont_1', '0', 75, 1).setOrigin(0.5);
        popup.messageText.tint = 0xffd924;
        popup.add(popup.messageText);
    },

    createHugeWinPUHandler: function(popup)
    {
        let yOffset = -70; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        backGround.setAlpha(0.9);
        popup.add(backGround);

        let panel = popup.scene.add.sprite(35, -30 + yOffset, 'hugewin_panel').setOrigin(0.5);
        popup.add(panel);
        // let title = popup.scene.add.sprite(0, -173 + yOffset, 'hugewin_title').setOrigin(0.5);
        // popup.add(title);

        // add message
        popup.messageText = popup.scene.add.bitmapText(32, 195 + yOffset, 'gameFont_1', '0', 75, 1).setOrigin(0.5);
        popup.messageText.tint  = 0xffd924;
        popup.add(popup.messageText);
    },

    createMegaWinPUHandler: function(popup)
    {
        let yOffset = -70; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        backGround.setAlpha(0.9);
        popup.add(backGround);

        let panel = popup.scene.add.sprite(10, -31 + yOffset, 'megawin_panel').setOrigin(0.5);
        popup.add(panel);
        // let title = popup.scene.add.sprite(2, -173 + yOffset, 'megawin_title').setOrigin(0.5);
        // popup.add(title);

        // add message
        popup.messageText = popup.scene.add.bitmapText(8, 180 + yOffset, 'gameFont_1', '0', 75, 1).setOrigin(0.5);
        popup.messageText.tint = 0xffd924;
        popup.add(popup.messageText);
    },

    createJackpotWinPUHandler: function(popup)
    {
        let yOffset = -40; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        backGround.setAlpha(0.9);
        popup.add(backGround);

        let panel = popup.scene.add.sprite(8, -120 + yOffset, 'jackpotwin_panel').setOrigin(0.5);
        popup.add(panel);
        // let title = popup.scene.add.sprite(0, -105 + yOffset, 'jackpotwin_title').setOrigin(0.5);
        // popup.add(title);

        // add message
        popup.messageText = popup.scene.add.bitmapText(5, 90 + yOffset, 'gameFont_1', '0', 75, 1).setOrigin(0.5);
        popup.messageText.tint = 0xffd924;
        popup.add(popup.messageText);
    },

    // just for blocking controls
    createEmptyPUHandler: function(popup)
    {
        // add background and panel
        let backGround = popup.scene.add.sprite(0, 0, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.setAlpha(0.01);
        popup.add(backGround);
    },
    
    // only message
    createSmallMessagePUHandler:function(popup)
    {
        let yOffset = -0; 
        // add background and panel
        let backGround = popup.scene.add.sprite(0, -0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000);
        backGround.setInteractive(); // block bottom controls
        backGround.tint = 0x3c3c3c;
        popup.add(backGround);
        backGround.setAlpha(0.5);

        let panel = popup.scene.add.sprite(0, 0 + yOffset, 'small_message_panel').setOrigin(0.5);
        popup.add(panel);

        // add message
        popup.messageText = popup.scene.add.bitmapText(0, -5 + yOffset, 'gameFont_1', 'Message', 42, 1).setOrigin(0.5);
        popup.messageText.tint = 0x4f312d;
        popup.add(popup.messageText);
    },
}

class AnimatedCoinParticle extends Phaser.GameObjects.Particles.Particle
{
    constructor (emitter)
    {
        super(emitter);

        this.t = 0;
        this.i = 0;
        this.framesCount = 7;
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
            [0, 0, -1, -1, -1],     // simulation #0, reel 0, reel 1
            [12, -1, 11, -1, 10],   // simulation #1, JP 
            [-1, -1, -1, -1, -1],   // simulation #2, full random
            [-1, -1, -1, -1, -1],   // simulation #3, full random
            [12, 9, 12, 10, 9],        // simulation #4, 5 scatters 
            [-1, -1, -1, -1, -1],   // simulation #5, full random
            [-1, -1, -1, -1, -1],   // simulation #6, full random
            [-1, -1, -1, -1, -1],   // simulation #7, full random
            [-1, -1, -1, -1, -1],   // simulation #8, full random
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