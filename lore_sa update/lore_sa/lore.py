import pandas as pd
import numpy as np
import os

from .surrogate import DecisionTreeSurrogate, Surrogate
from .bbox import AbstractBBox
from .dataset import TabularDataset, Dataset
from .encoder_decoder import ColumnTransformerEnc, EncDec
from .neighgen.genetic import GeneticGenerator
from .neighgen.neighborhood_generator import NeighborhoodGenerator
from .neighgen.random import RandomGenerator
from .neighgen.genetic_proba_generator import GeneticProbaGenerator


class Lore(object):

    def __init__(self, bbox: AbstractBBox, dataset: Dataset, encoder: EncDec,
                 generator: NeighborhoodGenerator, surrogate: Surrogate):
        """
        Creates a new instance of the LORE method.


        :param bbox: The black box model to be explained wrapped in a ``AbstractBBox`` object.
        :param dataset:
        :param encoder:
        :param generator:
        :param surrogate:
        """

        super().__init__()
        self.bbox = bbox
        self.dataset = dataset
        self.descriptor = dataset.descriptor
        self.encoder = encoder
        self.generator = generator
        self.surrogate = surrogate
        self.class_name = dataset.class_name


    def explain(self, x: np.array, num_instances=1000):
        """
        Explains a single instance of the dataset.
        :param x: an array with the values of the instance to explain (the target class is not included)
        :return:
        """
        # map the single record in input to the encoded space
        [z] = self.encoder.encode([x])
        # generate a neighborhood of instances around the projected instance `z`
        neighbour = self.generator.generate(z.copy(), num_instances, self.descriptor, self.encoder)
        dec_neighbor = self.encoder.decode(neighbour)
        # split neighbor in features and class using train_test_split
        neighb_train_X = dec_neighbor[:, :]
        neighb_train_y = self.bbox.predict(neighb_train_X)
        neighb_train_yb = self.encoder.encode_target_class(neighb_train_y.reshape(-1, 1)).squeeze()

        # train the surrogate model on the neighborhood
        # this surrogate could be another model. I would love to try with apriori 
        # or the modified version of SAME (Single tree Approximation MEthod <3 )
        self.surrogate.train(neighbour, neighb_train_yb)

        # extract the feature importances from the decision tree in self.dt
        if hasattr(self.surrogate, 'dt') and self.surrogate.dt is not None:
            intervals = self.encoder.get_encoded_intervals()
            features_ = self.encoder.encoded_descriptor
            importances = self.surrogate.dt.feature_importances_
            # construct a bitmap from the encoded values `z`
            bm = z.copy()
            # the numerical features takes zero values
            for i, _ in enumerate(features_['numeric']):
                bm[i] = 1;
            # multiply the feature importances with the bitmap array
            importances_ = importances * bm
            feature_importances = []
            for start, end in intervals:
                slice_ = importances_[start:end]
                non_zero = slice_[slice_ != 0]
                if len(non_zero) > 0:
                    feature_importances.append(non_zero[0])
                else:
                    feature_importances.append(0)
            feature_names = [self.encoder.encoded_features[start] for start, _ in intervals ]
            self.feature_importances = list(zip(feature_names, feature_importances))
        else:
            self.feature_importances = None # check if an alternative

        # get the rule for the instance `z`, decode using the encoder class
        rule = self.surrogate.get_rule(z, self.encoder)
        # print('rule', rule)

        crules, deltas = self.surrogate.get_counterfactual_rules(z, neighbour, neighb_train_yb, self.encoder)
        # I wants also the counterfactuals in the original space the so called "no_equal", as well the "equals"
        original_class = self.bbox.predict([x])
        no_equal = [x_c.tolist() for x_c,y_c in zip(dec_neighbor, neighb_train_y) if y_c != original_class]
        actual_class = [y_c for x_c,y_c in zip(dec_neighbor, neighb_train_y) if y_c != original_class]
        return {
            # 'x': x.tolist(),
            'rule': rule.to_dict(),
            'counterfactuals': [c.to_dict() for c in crules],
            'fidelity': self.surrogate.fidelity,
            'deltas': [[dd.to_dict() for dd in d] for d  in deltas],
            'counterfactual_samples': no_equal, # here are the cfs
            'counterfactual_predictions': actual_class,
            'feature_importances': self.feature_importances,
        }


    def webapp(self):
        print("🎯 Setting up Custom Dataset Explanation System")
        print("=" * 50)
        
        # Clean up existing processes on target ports first
        cleanup_ports([8000, 8080])
        
        from webapp.routes.state import global_state
        
        # Update global state to match what training normally does
        global_state.bbox = self.bbox
        global_state.dataset = self.dataset  
        # global_state.X_train = X_train
        # global_state.y_train = y_train
        # global_state.X_test = X_test
        # global_state.y_test = y_test
        global_state.descriptor = self.descriptor
        global_state.feature_names = [kk for k, v in self.dataset.descriptor.items() if k != "target" for kk in v.keys()]
        global_state.target_names = sorted(self.dataset[self.class_name].unique().tolist())
        global_state.dataset_name = "Custom Dataset"
        
        print("✅ Custom dataset and self.bbox loaded successfully!")
        print("=" * 50)
        os.environ["CUSTOM_DATA_LOADED"] = "true"
        launch_demo(width=width, height=height, scale=scale)
        

class TabularRandomGeneratorLore(Lore):

    def __init__(self, bbox: AbstractBBox, dataset: TabularDataset):
        """
        Creates a new instance of the LORE method.
        :param bbox: The black box model to be explained wrapped in a ``AbstractBBox`` object.
        :param dataset:
        :param encoder:
        :param generator:
        :param surrogate:
        """
        encoder = ColumnTransformerEnc(dataset.descriptor)
        generator = RandomGenerator(bbox, dataset, encoder, 0.1) # the last parameter is the ocr
        surrogate = DecisionTreeSurrogate()

        super().__init__(bbox, dataset, encoder, generator, surrogate)

    def explain_instance(self, x: np.array):
        return self.explain(x.values)

    def interact(self):
        self.webapp()

class TabularGeneticGeneratorLore(Lore):

    def __init__(self, bbox: AbstractBBox, dataset: TabularDataset):
        """
        Creates a new instance of the LORE method.


        :param bbox: The black box model to be explained wrapped in a ``AbstractBBox`` object.
        :param dataset:
        :param encoder:
        :param generator:
        :param surrogate:
        """
        encoder = ColumnTransformerEnc(dataset.descriptor)
        generator = GeneticGenerator(bbox, dataset, encoder, 0.1)
        surrogate = DecisionTreeSurrogate()

        super().__init__(bbox, dataset, encoder, generator, surrogate)

    def explain_instance(self, x: np.array):
        return self.explain(x.values)
        
    def interact(self):
        self.webapp()

class TabularRandGenGeneratorLore(Lore):
     
    def __init__(self, bbox: AbstractBBox, dataset: TabularDataset):
        """
            Creates a new instance of the LORE method.
            :param bbox: The black box model to be explained wrapped in a ``AbstractBBox`` object.
            :param dataset:
            :param encoder:
            :param generator:
            :param surrogate:
        """
        encoder = ColumnTransformerEnc(dataset.descriptor)
        generator = GeneticProbaGenerator(bbox,
                                            dataset,
                                            encoder,
                                            0.1)
        surrogate = DecisionTreeSurrogate()
        super().__init__(bbox, dataset, encoder, generator, surrogate)

    def explain_instance(self, x:np.array):
        return self.explain(x.values)
    
    def interact(self):
        self.webapp()