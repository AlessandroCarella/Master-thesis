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
        self.neighb_train_X = None
        self.neighb_train_y = None
        self.neighb_train_yz = None
        self.dt_surrogate = None

webapp_state = WebappState()