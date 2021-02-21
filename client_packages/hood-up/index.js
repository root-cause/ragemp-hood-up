// Natives
const GET_HASH_NAME_FOR_COMPONENT = "0x0368B3A838070348";
const GET_HASH_NAME_FOR_PROP = "0x5D6160275CAEC8DD";
const DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG = "0x341DE7ED1D2A1BFD";
const GET_SHOP_PED_APPAREL_VARIANT_COMPONENT_COUNT = "0xC17AD0E5752BECDA";
const GET_VARIANT_COMPONENT = "0x6E11F282F11863B6";
const GET_SHOP_PED_COMPONENT = "0x74C0E2A57EC66760";

// Constants
const hatPropIndex = 0;
const maskComponentIndex = 1;
const topComponentIndex = 11;

// Flags
const HOODED_JACKET = mp.game.joaat("HOODED_JACKET") >> 0;
const HOOD_UP = mp.game.joaat("HOOD_UP") >> 0;
const HOOD_DOWN = mp.game.joaat("HOOD_DOWN") >> 0;
const HOOD_TUCKED = mp.game.joaat("HOOD_TUCKED") >> 0;
const HOOD_HAT = mp.game.joaat("HOOD_HAT") >> 0;
const JENKINS_ZERO = mp.game.joaat("0") >> 0;

const maskFlags = [
    mp.game.joaat("HOOD_COMPAT") >> 0,
    mp.game.joaat("REBREATHER") >> 0,
    mp.game.joaat("HAZ_MASK") >> 0,
    mp.game.joaat("SKI_MASK") >> 0,
    mp.game.joaat("GAS_MASK") >> 0,
    mp.game.joaat("BIKER_MASK") >> 0
];

// Functions
function canUseCurrentHatWithHoodie() {
    const curHatDrawable = mp.players.local.getPropIndex(hatPropIndex);

    // No hat = no clipping
    if (curHatDrawable === -1) {
        return true;
    }

    const curHatHash = mp.game.invoke(
        GET_HASH_NAME_FOR_PROP,
        mp.players.local.handle,
        hatPropIndex,
        curHatDrawable,
        mp.players.local.getPropTextureIndex(hatPropIndex)
    ) >> 0;

    return mp.game.invoke(DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG, curHatHash, HOOD_HAT);
}

function canUseCurrentMaskWithHoodie() {
    const curMaskDrawable = mp.players.local.getDrawableVariation(maskComponentIndex);

    // No mask = no clipping
    if (curMaskDrawable === 0) {
        return true;
    }

    const curMaskHash = mp.game.invoke(
        GET_HASH_NAME_FOR_COMPONENT,
        mp.players.local.handle,
        maskComponentIndex,
        curMaskDrawable,
        mp.players.local.getTextureVariation(maskComponentIndex)
    ) >> 0;

    return maskFlags.some(flag => mp.game.invoke(DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG, curMaskHash, flag));
}

function findHoodieVariant(topHash, targetFlag) {
    let outVariant = {
        hash: [0],
        index: [0],
        type: [0]
    };

    for (let i = 0, max = mp.game.invoke(GET_SHOP_PED_APPAREL_VARIANT_COMPONENT_COUNT, topHash); i < max; i++) {
        mp.game.invoke(GET_VARIANT_COMPONENT, topHash, i, outVariant.hash, outVariant.index, outVariant.type);

        if (outVariant.type[0] !== topComponentIndex || outVariant.hash[0] === -1 || outVariant.hash[0] === 0 || outVariant.hash[0] === JENKINS_ZERO) {
            // Could've used outVariant.index[0] with GET_HASH_NAME_FOR_COMPONENT to get component hash, then check DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG with hash and targetFlag
            // Alternatively could've just returned outVariant.index[0] directly (as it probably refers to initial freemode ped clothing?)
            // Current approach seems to work just fine though, so I'll just skip the extra work
            continue;
        }

        if (mp.game.invoke(DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG, outVariant.hash[0], targetFlag)) {
            return getHoodieByHash(outVariant.hash[0]);
        }
    }

    return { drawable: -1, texture: -1 };
}

function getHoodieByHash(hash) {
    // Could've used https://rage.mp/files/file/294-mpgamedata/ for this
    let buffer = [ new ArrayBuffer(136) ];

    if (mp.game.invoke(GET_SHOP_PED_COMPONENT, hash >> 0, buffer) === 0) {
        return { drawable: -1, texture: -1 };
    }

    // Only need the drawable and texture
    const { 6: drawable, 8: texture } = new Uint32Array(buffer[0]);
    return { drawable, texture };
}

// Events
mp.keys.bind(0x74 /* F5 */, false, () => {
    const topHash = mp.game.invoke(
        GET_HASH_NAME_FOR_COMPONENT,
        mp.players.local.handle,
        topComponentIndex,
        mp.players.local.getDrawableVariation(topComponentIndex),
        mp.players.local.getTextureVariation(topComponentIndex)
    ) >> 0;

    // Check if current top is a hoodie (and not a tucked hoodie variant)
    if (mp.game.invoke(DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG, topHash, HOODED_JACKET, 0) && !mp.game.invoke(DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG, topHash, HOOD_TUCKED, 0)) {
        const isHoodDown = mp.game.invoke(DOES_SHOP_PED_APPAREL_HAVE_RESTRICTION_TAG, topHash, HOOD_DOWN, 0);

        // If player is wearing the hood down variation, check for hat/mask clipping
        if (isHoodDown) {
            if (!canUseCurrentHatWithHoodie()) {
                mp.gui.chat.push("Your hat prevents you from hooding up.");
                return;
            }

            if (!canUseCurrentMaskWithHoodie()) {
                mp.gui.chat.push("Your mask prevents you from hooding up.");
                return;
            }
        }

        const { drawable, texture } = findHoodieVariant(topHash, isHoodDown ? HOOD_UP : HOOD_DOWN);

        // Invalid drawable, no change
        if (drawable === -1) {
            return;
        }

        mp.events.callRemote("hoodup::setTop", drawable, texture);
    }
});