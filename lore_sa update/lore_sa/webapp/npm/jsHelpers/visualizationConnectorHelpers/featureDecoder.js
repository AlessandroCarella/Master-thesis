/**
 * @fileoverview Feature decoder utility for mapping encoded features back to human-readable format.
 * Handles one-hot encoded categorical features and provides translation between encoded and original feature representations.
 * @author Generated documentation
 * @module FeatureDecoder
 */

/**
 * @typedef {Object} FeatureMapping
 * @property {string} originalName - Original feature name before encoding
 * @property {string} type - Feature type ('categorical' or 'numeric')
 * @property {string} [categoryValue] - Category value for categorical features
 */

/**
 * @typedef {Object} FeatureMappingInfo
 * @property {Array<string>} [originalFeatureNames] - List of original feature names
 * @property {Array<string>} [encodedFeatureNames] - List of encoded feature names
 * @property {Object} [datasetDescriptor] - Dataset descriptor with feature information
 */

/**
 * Utility class for decoding encoded features back to human-readable format.
 * Handles translation between one-hot encoded categorical features and original categorical values.
 * 
 * @class
 * @example
 * const decoder = new FeatureDecoder(mappingInfo, originalInstance);
 * const readable = decoder.decodeScatterPointData(encodedData);
 * // Converts { feature1_A: 1, feature1_B: 0, feature2: 1.5 }
 * // to { feature1: 'A', feature2: 1.5 }
 */
export class FeatureDecoder {
    /**
     * Creates a new FeatureDecoder instance.
     * 
     * @param {FeatureMappingInfo} featureMappingInfo - Feature mapping configuration
     * @param {Object} [originalInstance] - Original instance data for reference
     * @example
     * const decoder = new FeatureDecoder({
     *   originalFeatureNames: ['species', 'sepal_length'],
     *   encodedFeatureNames: ['species_setosa', 'species_versicolor', 'sepal_length'],
     *   datasetDescriptor: { categorical: {...}, numeric: {...} }
     * }, originalData);
     */
    constructor(featureMappingInfo, originalInstance) {
        this.featureMappingInfo = featureMappingInfo;
        this.originalInstance = originalInstance || {};
        this.originalFeatureNames = featureMappingInfo?.originalFeatureNames || [];
        this.encodedFeatureNames = featureMappingInfo?.encodedFeatureNames || [];
        this.datasetDescriptor = featureMappingInfo?.datasetDescriptor || {};
        
        this.createFeatureMapping();
    }
    
    /**
     * Creates internal mapping from encoded to original feature names.
     * Processes categorical and numeric features to build translation tables.
     * 
     * @private
     * @example
     * // Automatically called in constructor
     * // Creates mappings like: 'species_setosa' -> { originalName: 'species', type: 'categorical', categoryValue: 'setosa' }
     */
    createFeatureMapping() {
        this.encodedToOriginalMap = new Map();
        this.originalToCategoricalValues = new Map();
        
        if (this.datasetDescriptor.categorical) {
            Object.entries(this.datasetDescriptor.categorical).forEach(([originalName, info]) => {
                this.originalToCategoricalValues.set(originalName, info.distinct_values || []);
                
                if (info.distinct_values) {
                    info.distinct_values.forEach(value => {
                        const encodedName = `${originalName}_${value}`;
                        this.encodedToOriginalMap.set(encodedName, {
                            originalName,
                            type: 'categorical',
                            categoryValue: value
                        });
                    });
                }
            });
        }
        
        if (this.datasetDescriptor.numeric) {
            Object.keys(this.datasetDescriptor.numeric).forEach(originalName => {
                this.encodedToOriginalMap.set(originalName, {
                    originalName,
                    type: 'numeric'
                });
            });
        }
    }
    
    /**
     * Decodes encoded scatter plot point data back to human-readable format.
     * Converts one-hot encoded categorical features back to original categorical values.
     * 
     * @param {Object} encodedData - Encoded data point with one-hot categorical features
     * @returns {Object} Decoded data with original feature names and values
     * @throws {Error} When encoded data structure is invalid
     * @example
     * const encoded = { 
     *   species_setosa: 1, 
     *   species_versicolor: 0, 
     *   sepal_length: 5.1 
     * };
     * const decoded = decoder.decodeScatterPointData(encoded);
     * // Returns: { species: 'setosa', sepal_length: 5.1 }
     * 
     * @see createFeatureMapping
     */
    decodeScatterPointData(encodedData) {
        const decodedData = {};
        
        const featureGroups = new Map();
        const numericFeatures = new Set();
        
        Object.entries(encodedData).forEach(([encodedName, value]) => {
            const mapping = this.encodedToOriginalMap.get(encodedName);
            
            if (mapping) {
                if (mapping.type === 'categorical') {
                    if (!featureGroups.has(mapping.originalName)) {
                        featureGroups.set(mapping.originalName, []);
                    }
                    featureGroups.get(mapping.originalName).push({
                        categoryValue: mapping.categoryValue,
                        encodedValue: value
                    });
                } else if (mapping.type === 'numeric') {
                    decodedData[mapping.originalName] = value;
                }
            } else {
                if (encodedName.includes('_')) {
                    const lastUnderscoreIndex = encodedName.lastIndexOf('_');
                    const originalName = encodedName.substring(0, lastUnderscoreIndex);
                    const categoryValue = encodedName.substring(lastUnderscoreIndex + 1);
                    
                    if (value === 0 || value === 1) {
                        if (!featureGroups.has(originalName)) {
                            featureGroups.set(originalName, []);
                        }
                        featureGroups.get(originalName).push({
                            categoryValue: categoryValue,
                            encodedValue: value
                        });
                    } else {
                        decodedData[encodedName] = value;
                    }
                } else {
                    if (this.originalInstance.hasOwnProperty(encodedName) || 
                        typeof value === 'number') {
                        decodedData[encodedName] = value;
                        numericFeatures.add(encodedName);
                    } else {
                        decodedData[encodedName] = value;
                    }
                }
            }
        });
        
        featureGroups.forEach((categories, originalName) => {
            const activeCategory = categories.find(cat => cat.encodedValue === 1);
            
            if (activeCategory) {
                decodedData[originalName] = activeCategory.categoryValue;
            } else {
                if (this.originalInstance.hasOwnProperty(originalName)) {
                    decodedData[originalName] = this.originalInstance[originalName];
                } else {
                    const maxCategory = categories.reduce((max, cat) => 
                        cat.encodedValue > max.encodedValue ? cat : max, categories[0]);
                    if (maxCategory.encodedValue > 0) {
                        decodedData[originalName] = maxCategory.categoryValue;
                    }
                }
            }
        });
        
        if (this.originalInstance && Object.keys(this.originalInstance).length > 0) {
            Object.entries(this.originalInstance).forEach(([name, value]) => {
                if ((!this.originalFeatureNames.length || this.originalFeatureNames.includes(name)) && 
                    !decodedData.hasOwnProperty(name)) {
                    
                    const hasEncodedVersion = Object.keys(encodedData).some(encodedName => {
                        return encodedName === name || encodedName.startsWith(name + '_');
                    });
                    
                    if (!hasEncodedVersion) {
                        decodedData[name] = value;
                    }
                }
            });
        }
        
        return decodedData;
    }
    
    /**
     * Decodes a tree split condition for display in tooltips or labels.
     * Converts encoded feature names and thresholds back to readable format.
     * 
     * @param {string} encodedFeatureName - Encoded feature name from tree split
     * @param {number} threshold - Split threshold value
     * @param {boolean} [isLeftChild=true] - Whether this is for the left child condition
     * @returns {string} Human-readable split condition
     * @example
     * const condition = decoder.decodeTreeSplitCondition('species_setosa', 0.5, true);
     * // Returns: 'species = setosa' or 'species ≠ setosa'
     * 
     * @example
     * const condition = decoder.decodeTreeSplitCondition('sepal_length', 5.5, false);
     * // Returns: 'sepal_length > 5.5'
     */
    decodeTreeSplitCondition(encodedFeatureName, threshold, isLeftChild = true) {
        const mapping = this.encodedToOriginalMap.get(encodedFeatureName);
        
        if (!mapping) {
            const operator = isLeftChild ? '≤' : '>';
            return `${encodedFeatureName} ${operator} ${threshold.toFixed(1)}`;
        }
        
        if (mapping.type === 'categorical') {
            if (threshold >= 0.5) {
                return isLeftChild ? 
                    `${mapping.originalName} = ${mapping.categoryValue}` :
                    `${mapping.originalName} ≠ ${mapping.categoryValue}`;
            } else {
                return isLeftChild ? 
                    `${mapping.originalName} ≠ ${mapping.categoryValue}` :
                    `${mapping.originalName} = ${mapping.categoryValue}`;
            }
        } else if (mapping.type === 'numeric') {
            const operator = isLeftChild ? '≤' : '>';
            return `${mapping.originalName} ${operator} ${threshold.toFixed(1)}`;
        }
        
        return `${encodedFeatureName} ${isLeftChild ? '≤' : '>'} ${threshold.toFixed(1)}`;
    }
    
    /**
     * Gets the original feature name from an encoded feature name.
     * 
     * @param {string} encodedFeatureName - Encoded feature name
     * @returns {string} Original feature name
     * @example
     * const original = decoder.getOriginalFeatureName('species_setosa');
     * // Returns: 'species'
     */
    getOriginalFeatureName(encodedFeatureName) {
        const mapping = this.encodedToOriginalMap.get(encodedFeatureName);
        return mapping ? mapping.originalName : encodedFeatureName;
    }
    
    /**
     * Checks if a feature is categorical based on encoding patterns.
     * 
     * @param {string} featureName - Feature name to check
     * @returns {boolean} True if feature is categorical
     * @example
     * const isCat = decoder.isCategorical('species_setosa');
     * // Returns: true
     */
    isCategorical(featureName) {
        const mapping = this.encodedToOriginalMap.get(featureName);
        if (mapping) {
            return mapping.type === 'categorical';
        }
        return this.datasetDescriptor.categorical && 
               this.datasetDescriptor.categorical.hasOwnProperty(featureName);
    }
    
    /**
     * Checks if a feature is numeric based on encoding patterns.
     * 
     * @param {string} featureName - Feature name to check
     * @returns {boolean} True if feature is numeric
     * @example
     * const isNum = decoder.isNumeric('sepal_length');
     * // Returns: true
     */
    isNumeric(featureName) {
        const mapping = this.encodedToOriginalMap.get(featureName);
        if (mapping) {
            return mapping.type === 'numeric';
        }
        return this.datasetDescriptor.numeric && 
               this.datasetDescriptor.numeric.hasOwnProperty(featureName);
    }
}
