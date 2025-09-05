// featureDecoder.js - Utility for mapping encoded features back to decoded/readable format

export class FeatureDecoder {
    constructor(featureMappingInfo, originalInstance) {
        this.featureMappingInfo = featureMappingInfo;
        this.originalInstance = originalInstance || {};
        this.originalFeatureNames = featureMappingInfo?.originalFeatureNames || [];
        this.encodedFeatureNames = featureMappingInfo?.encodedFeatureNames || [];
        this.datasetDescriptor = featureMappingInfo?.datasetDescriptor || {};
        
        // Create mapping from encoded to original feature names
        this.createFeatureMapping();
    }
    
    createFeatureMapping() {
        this.encodedToOriginalMap = new Map();
        this.originalToCategoricalValues = new Map();
        
        // Process categorical features
        if (this.datasetDescriptor.categorical) {
            Object.entries(this.datasetDescriptor.categorical).forEach(([originalName, info]) => {
                // Store all possible values for this categorical feature
                this.originalToCategoricalValues.set(originalName, info.distinct_values || []);
                
                // Map each encoded categorical feature back to original
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
        
        // Process numeric features
        if (this.datasetDescriptor.numeric) {
            Object.keys(this.datasetDescriptor.numeric).forEach(originalName => {
                this.encodedToOriginalMap.set(originalName, {
                    originalName,
                    type: 'numeric'
                });
            });
        }
    }
    
    decodeScatterPointData(encodedData) {
        const decodedData = {};
        
        // Group encoded features by original feature name
        const featureGroups = new Map();
        const numericFeatures = new Set();
        
        // First pass: identify and categorize all features
        Object.entries(encodedData).forEach(([encodedName, value]) => {
            // Check if it's a known mapping
            const mapping = this.encodedToOriginalMap.get(encodedName);
            
            if (mapping) {
                // Use existing mapping
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
                // Try to infer the feature type and original name
                if (encodedName.includes('_')) {
                    // Likely a one-hot encoded categorical feature: originalName_categoryValue
                    const lastUnderscoreIndex = encodedName.lastIndexOf('_');
                    const originalName = encodedName.substring(0, lastUnderscoreIndex);
                    const categoryValue = encodedName.substring(lastUnderscoreIndex + 1);
                    
                    // Only consider this a categorical feature if the value is 0 or 1 (typical for one-hot encoding)
                    if (value === 0 || value === 1) {
                        if (!featureGroups.has(originalName)) {
                            featureGroups.set(originalName, []);
                        }
                        featureGroups.get(originalName).push({
                            categoryValue: categoryValue,
                            encodedValue: value
                        });
                    } else {
                        // If value is not 0 or 1, treat as numeric
                        decodedData[encodedName] = value;
                    }
                } else {
                    // No underscore - likely a numeric feature with original name preserved
                    // Also check if this feature exists in originalInstance to confirm it's numeric
                    if (this.originalInstance.hasOwnProperty(encodedName) || 
                        typeof value === 'number') {
                        decodedData[encodedName] = value;
                        numericFeatures.add(encodedName);
                    } else {
                        // Unknown feature type, include as-is
                        decodedData[encodedName] = value;
                    }
                }
            }
        });
        
        // Second pass: resolve categorical features to their original values
        featureGroups.forEach((categories, originalName) => {
            // Find category with value 1 (one-hot encoding - active category)
            const activeCategory = categories.find(cat => cat.encodedValue === 1);
            
            if (activeCategory) {
                decodedData[originalName] = activeCategory.categoryValue;
            } else {
                // Fallback strategies
                // 1. Try to find the category from originalInstance if available
                if (this.originalInstance.hasOwnProperty(originalName)) {
                    decodedData[originalName] = this.originalInstance[originalName];
                } else {
                    // 2. Find category with highest value
                    const maxCategory = categories.reduce((max, cat) => 
                        cat.encodedValue > max.encodedValue ? cat : max, categories[0]);
                    if (maxCategory.encodedValue > 0) {
                        decodedData[originalName] = maxCategory.categoryValue;
                    }
                    // If all values are 0, we might skip this feature or use a default
                }
            }
        });
        
        // Third pass: add any features from original instance that weren't processed
        // but only if they correspond to original feature names we expect
        if (this.originalInstance && Object.keys(this.originalInstance).length > 0) {
            Object.entries(this.originalInstance).forEach(([name, value]) => {
                // Only add if:
                // 1. It's in our original feature names list (if available), OR
                // 2. We don't have original feature names list, OR  
                // 3. We haven't already processed this feature
                if ((!this.originalFeatureNames.length || this.originalFeatureNames.includes(name)) && 
                    !decodedData.hasOwnProperty(name)) {
                    
                    // Check if we have any encoded version of this feature
                    const hasEncodedVersion = Object.keys(encodedData).some(encodedName => {
                        return encodedName === name || encodedName.startsWith(name + '_');
                    });
                    
                    // Only add from original instance if we don't have encoded version
                    if (!hasEncodedVersion) {
                        decodedData[name] = value;
                    }
                }
            });
        }
        
        return decodedData;
    }
    
    decodeTreeSplitCondition(encodedFeatureName, threshold, isLeftChild = true) {
        const mapping = this.encodedToOriginalMap.get(encodedFeatureName);
        
        if (!mapping) {
            // Fallback to encoded name if no mapping found
            const operator = isLeftChild ? '≤' : '>';
            return `${encodedFeatureName} ${operator} ${threshold.toFixed(1)}`;
        }
        
        if (mapping.type === 'categorical') {
            // For categorical: feature_name = value (when encoded value is 1)
            // or feature_name ≠ value (when encoded value is 0)
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
            // For numeric: show original feature name with threshold
            const operator = isLeftChild ? '≤' : '>';
            return `${mapping.originalName} ${operator} ${threshold.toFixed(1)}`;
        }
        
        return `${encodedFeatureName} ${isLeftChild ? '≤' : '>'} ${threshold.toFixed(1)}`;
    }
    
    getOriginalFeatureName(encodedFeatureName) {
        const mapping = this.encodedToOriginalMap.get(encodedFeatureName);
        return mapping ? mapping.originalName : encodedFeatureName;
    }
    
    isCategorical(featureName) {
        const mapping = this.encodedToOriginalMap.get(featureName);
        if (mapping) {
            return mapping.type === 'categorical';
        }
        // Check if it's an original categorical feature
        return this.datasetDescriptor.categorical && 
               this.datasetDescriptor.categorical.hasOwnProperty(featureName);
    }
    
    isNumeric(featureName) {
        const mapping = this.encodedToOriginalMap.get(featureName);
        if (mapping) {
            return mapping.type === 'numeric';
        }
        // Check if it's an original numeric feature
        return this.datasetDescriptor.numeric && 
               this.datasetDescriptor.numeric.hasOwnProperty(featureName);
    }
}
