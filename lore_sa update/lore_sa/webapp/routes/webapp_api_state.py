class WebappState:
    def __init__(self):
        self.bbox = None
        self.descriptor = None
        self.X = None
        self.y = None
        
        self.dataset = None
        self.dataset_name = None
        self.feature_names = None
        self.target_names = None
        self.encoded_feature_names = None

        self.neighborhood = None
        self.neighb_encoded_predictions = None

        self.decoded_neighborhood = None
        self.neighb_predictions = None
        self.dt_surrogate = None

webapp_state = WebappState()