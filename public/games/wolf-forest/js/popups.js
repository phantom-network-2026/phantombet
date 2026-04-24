// --------------- MESSAGES -------------------

// message with yes, no, close buttons
function createGameMessagePUHandlerYNC(popup)
{
    let yOffset = -0; 
    // add background and panel
    let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716); 
    backGround.setInteractive(); // block bottom controls
    popup.add(backGround);

    let panel = popup.scene.add.sprite(0, 0 + yOffset, 'message_panel').setOrigin(0.5);
    popup.add(panel);

    // add caption
    popup.captionText = popup.scene.add.bitmapText(0, -110 + yOffset, 'gameFont_1', 'Caption', 42, 1).setOrigin(0.5).setTint(0xffffff); 
    popup.add(popup.captionText);

    // add message
    popup.messageText = popup.scene.add.bitmapText(0, -30 + yOffset, 'gameFont_0', 'Message', 42, 1).setOrigin(0.5).setTint(0x56bdd0);
    popup.add(popup.messageText);

    // add buttons
    popup.addButton('okButton','small_button', 'small_button_hover', false, -90, 90 + yOffset);
    popup.addButton('noButton','small_button', 'small_button_hover', false, 90, 90 + yOffset);
    popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 190, -182 + yOffset);
    popup['okButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
    popup['noButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
    popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);

    // add button text
    popup.okText = popup.scene.add.bitmapText(-90, 85 + yOffset, 'gameFont_1', 'Ok', 48, 1).setOrigin(0.5);
    popup.add(popup.okText);

    popup.noText = popup.scene.add.bitmapText(90, 85 + yOffset, 'gameFont_1', 'No', 48, 1).setOrigin(0.5);
    popup.add(popup.noText);
}

// message with close button
function createGameMessagePUHandler(popup)
{
    let yOffset = -0; 
    // add background and panel
    let backGround = popup.scene.add.sprite(0, 0 + yOffset, 'white_bkg').setOrigin(0.5).setScale(2000).setTint(0x171716); 
    backGround.setInteractive(); // block bottom controls
    popup.add(backGround);
    let panel = popup.scene.add.sprite(0, 0 + yOffset, 'message_panel').setOrigin(0.5);
    popup.add(panel);

    // add caption
    popup.captionText = popup.scene.add.bitmapText(0, -110 + yOffset, 'gameFont_1', 'Caption', 42, 1).setOrigin(0.5).setTint(0xffffff);
    popup.add(popup.captionText);

    // add message
    popup.messageText = popup.scene.add.bitmapText(0, -30 + yOffset, 'gameFont_0', 'Message', 42, 1).setOrigin(0.5).setTint(0x56bdd0);
    popup.add(popup.messageText);

    // add buttons
    popup.addButton('exitButton','exit_button', 'exit_button_hover', false, 190, -182 + yOffset);
    popup['exitButton'].clickEvent.add(()=>{popup.scene.soundController.playClip('button_click', false);}, popup);
}
