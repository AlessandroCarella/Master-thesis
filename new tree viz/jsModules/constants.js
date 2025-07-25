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
    mainSpacing: 300,
    startY: 150,
    branchDistance: 200,
    angleSpread: 0.3,
    rectWidth: 250,
    rectHeight: {
        leaf: 200,
        decision: 200
    },
    circleRadius: 8
};

// --- Visualization Layout and Appearance Constants ---

export const ANGLES = {
    branchLeft: -Math.PI / 2, // -45 degrees
    branchRight: Math.PI / 2, // +45 degrees
};

export const ZOOM_CONFIG = {
    extraBounds: 1000, // padding added to bounds for zoom calculation
    minScale: 1, // minimum initial scale
    scaleExtentFactor: 1, // minimum zoom as a factor of initial scale
    maxZoom: 5 // maximum zoom
};

export const TEXT_CONFIG = {
    leaf: {
        titleOffset: -75,
        classOffset: -50,
        samplesOffset: 0,
        distLabelOffset: 20,
        distValueOffset: 40,
        titleFontSize: '15px',
        classFontSize: '15px',
        samplesFontSize: '15px',
        distFontSize: '15px',
    },
    decision: {
        titleOffset: -75,
        featureOffset: -50,
        thresholdOffset: -20,
        instanceOffset: 0,
        decisionOffset: 20,
        samplesOffset: 40,
        impurityOffset: 60,
        titleFontSize: '15px',
        featureFontSize: '15px',
        thresholdFontSize: '15px',
        instanceFontSize: '15px',
        decisionFontSize: '15px',
        samplesFontSize: '15px',
        impurityFontSize: '15px',
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