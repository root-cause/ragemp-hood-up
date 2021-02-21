const topComponentIndex = 11;

mp.events.add("hoodup::setTop", (player, newTopDrawable, newTopTexture) => {
    if (newTopDrawable < 0 || newTopTexture < 0 || newTopTexture > 25) {
        return;
    }

    player.setClothes(topComponentIndex, newTopDrawable, newTopTexture, 2);
});