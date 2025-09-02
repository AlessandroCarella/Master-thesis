// encoding_decoding.js - Unified feature mapping and encoding/decoding functionality

import { TREES_SETTINGS } from "../TreesCommon/settings.js";
import { getTreeState } from "../TreesCommon/state.js";

// Global feature mapping storage
let globalFeatureMappingInfo = null;

export function storeFeatureMappingInfo(featureMappingInfo) {
    if (!featureMappingInfo || !validateFeatureMappingInfo(featureMappingInfo)) {
        console.warn("Invalid feature mapping info provided");
        return;
    }
    
    // Store globally
    globalFeatureMappingInfo = featureMappingInfo;
    
    // Store in all tree states for backward compatibility
    const classicState = getTreeState(TREES_SETTINGS.treeKindID.classic);
    const blocksState = getTreeState(TREES_SETTINGS.treeKindID.blocks);
    const spawnState = getTreeState(TREES_SETTINGS.treeKindID.spawn);
    
    classicState.featureMappingInfo = featureMappingInfo;
    blocksState.featureMappingInfo = featureMappingInfo;
    spawnState.featureMappingInfo = featureMappingInfo;
}

export function getFeatureMappingInfo() {
    if (globalFeatureMappingInfo) {
        return globalFeatureMappingInfo;
    }
    
    // Fallback: try to get from any tree state
    const states = [
        getTreeState(TREES_SETTINGS.treeKindID.classic),
        getTreeState(TREES_SETTINGS.treeKindID.blocks),
        getTreeState(TREES_SETTINGS.treeKindID.spawn)
    ];
    
    for (const state of states) {
        if (state.featureMappingInfo) {
            return state.featureMappingInfo;
        }
    }
    
    return null;
}

// ---------------- Core Feature Mapping Functions ---------------- //

function getOriginalFeatureName(encodedFeatureName, featureMappingInfo = null) {
    const mappingInfo = featureMappingInfo || getFeatureMappingInfo();
    if (!mappingInfo || !mappingInfo.datasetDescriptor) {
        return encodedFeatureName;
    }
    
    const { datasetDescriptor } = mappingInfo;
    
    // Check categorical features (one-hot encoded)
    for (const [originalFeatureName, info] of Object.entries(datasetDescriptor.categorical || {})) {
        if (encodedFeatureName.startsWith(originalFeatureName + '_')) {
            return originalFeatureName;
        }
    }
    
    // Check numeric features (should match exactly)
    for (const [originalFeatureName, info] of Object.entries(datasetDescriptor.numeric || {})) {
        if (encodedFeatureName === originalFeatureName) {
            return originalFeatureName;
        }
    }
    
    return encodedFeatureName;
}

function getCategoryValueFromEncodedName(encodedFeatureName) {
    const underscoreIndex = encodedFeatureName.lastIndexOf('_');
    if (underscoreIndex === -1) {
        return null;
    }
    return encodedFeatureName.substring(underscoreIndex + 1);
}

function isFeatureCategorical(encodedFeatureName, featureMappingInfo = null) {
    const mappingInfo = featureMappingInfo || getFeatureMappingInfo();
    if (!mappingInfo || !mappingInfo.datasetDescriptor) {
        return false;
    }
    
    const { datasetDescriptor } = mappingInfo;
    
    // Check if this is a one-hot encoded categorical feature
    for (const [originalFeatureName, info] of Object.entries(datasetDescriptor.categorical || {})) {
        if (encodedFeatureName.startsWith(originalFeatureName + '_')) {
            return true;
        }
    }
    
    return false;
}

// ---------------- Categorical Split Evaluation ---------------- //

export function evaluateCategoricalSplit(encodedFeatureName, threshold, instanceData, featureMappingInfo = null) {
    const mappingInfo = featureMappingInfo || getFeatureMappingInfo();
    if (!mappingInfo || !mappingInfo.datasetDescriptor) {
        return null; // Not a categorical feature, treat as numeric
    }
    
    const { datasetDescriptor } = mappingInfo;
    
    // Check if this is a one-hot encoded categorical feature
    for (const [originalFeatureName, info] of Object.entries(datasetDescriptor.categorical || {})) {
        if (encodedFeatureName.startsWith(originalFeatureName + '_')) {
            const categoryValue = getCategoryValueFromEncodedName(encodedFeatureName);
            const instanceValue = instanceData[originalFeatureName];
            
            // For one-hot encoding: if instance matches this category, encoded value is 1, else 0
            const encodedFeatureValue = (instanceValue === categoryValue) ? 1 : 0;
            
            // Apply threshold logic
            return encodedFeatureValue <= threshold;
        }
    }
    
    return null; // Not a categorical feature
}

// ---------------- Display Functions ---------------- //

function getFeatureDisplayName(encodedFeatureName, featureMappingInfo = null) {
    return getOriginalFeatureName(encodedFeatureName, featureMappingInfo);
}

function getFeatureConditionString(encodedFeatureName, threshold, featureMappingInfo = null) {
    const mappingInfo = featureMappingInfo || getFeatureMappingInfo();
    
    if (mappingInfo && isFeatureCategorical(encodedFeatureName, mappingInfo)) {
        // Categorical feature
        const originalFeatureName = getOriginalFeatureName(encodedFeatureName, mappingInfo);
        const categoryValue = getCategoryValueFromEncodedName(encodedFeatureName);
        
        // For one-hot encoding with typical threshold 0.5:
        // <= 0.5 means "not this category", > 0.5 means "is this category"
        const condition = threshold <= 0.5 ? `!= "${categoryValue}"` : `= "${categoryValue}"`;
        return `${originalFeatureName} ${condition}`;
    } else {
        // Numeric feature
        const displayName = getFeatureDisplayName(encodedFeatureName, mappingInfo);
        const th = Number(threshold) ?? 0;
        return `${displayName} ≤ ${Number.isFinite(th) ? th.toFixed(3) : th}`;
    }
}

export function getNodeLabelLines(nodeData, featureMappingInfo = null) {
    if (!nodeData) return ['Unknown Node'];

    if (nodeData.is_leaf) {
        return [nodeData.class_label || 'Unknown'];
    }
    
    const conditionString = getFeatureConditionString(nodeData.feature_name, nodeData.threshold, featureMappingInfo);
    return [conditionString];
}

// ---------------- Validation ---------------- //

function validateFeatureMappingInfo(featureMappingInfo) {
    if (!featureMappingInfo || typeof featureMappingInfo !== 'object') {
        return false;
    }
    
    if (!featureMappingInfo.datasetDescriptor || typeof featureMappingInfo.datasetDescriptor !== 'object') {
        return false;
    }
    
    const { datasetDescriptor } = featureMappingInfo;
    
    // Check categorical features structure
    if (datasetDescriptor.categorical && typeof datasetDescriptor.categorical !== 'object') {
        return false;
    }
    
    // Check numeric features structure
    if (datasetDescriptor.numeric && typeof datasetDescriptor.numeric !== 'object') {
        return false;
    }
    
    return true;
}
