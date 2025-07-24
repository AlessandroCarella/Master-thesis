export const DEFAULT_COLORS = [
    "#8dd3c7",
    "#ffffb3",
    "#bebada",
    "#fb8072",
    "#80b1d3",
    "#fdb462",
    "#b3de69",
    "#fccde5",
    "#d9d9d9",
    "#bc80bd"
];

export const DIMENSIONS = {
    width: 1000,
    height: 1000
};

export const LAYOUT_CONFIG = {
    mainSpacing: 280,
    startY: 150,
    branchDistance: 100,
    angleSpread: 0.3,
    rectWidth: 160,
    rectHeight: {
        leaf: 80,
        decision: 100
    },
    circleRadius: 8
};

// --- Visualization Layout and Appearance Constants ---

export const ANGLES = {
    branchLeft: -Math.PI / 4, // -45 degrees
    branchRight: Math.PI / 4, // +45 degrees
};

export const ZOOM_CONFIG = {
    extraBounds: 800, // padding added to bounds for zoom calculation
    minScale: 0.3, // minimum initial scale
    scaleExtentFactor: 0.2, // minimum zoom as a factor of initial scale
    maxZoom: 5 // maximum zoom
};

export const TEXT_CONFIG = {
    leaf: {
        titleOffset: -25,
        classOffset: -12,
        samplesOffset: 2,
        distLabelOffset: 12,
        distValueOffset: 22,
        titleFontSize: '9px',
        classFontSize: '9px',
        samplesFontSize: '7px',
        distFontSize: '7px',
    },
    decision: {
        titleOffset: -32,
        featureOffset: -20,
        thresholdOffset: -8,
        instanceOffset: 4,
        decisionOffset: 16,
        samplesOffset: 28,
        impurityOffset: 38,
        titleFontSize: '8px',
        featureFontSize: '8px',
        thresholdFontSize: '7px',
        instanceFontSize: '7px',
        decisionFontSize: '7px',
        samplesFontSize: '7px',
        impurityFontSize: '7px',
    }
};

export const COLORS = {
    mainPathRect: '#f8f8f8',
    branchCircle: '#cccccc',
    mainPathRectStroke: '#333',
    mainPathRectFill: 'white',
    link: '#999',
    linkMainPath: '#333',
    tooltipBg: 'rgba(44, 62, 80, 0.95)',
    tooltipText: 'white',
};