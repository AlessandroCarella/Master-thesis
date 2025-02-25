class GlobalState:
    def __init__(self):
        self.bbox = None
        self.descriptor = None
        self.dataset = None
        self.dataset_name = None
        self.feature_names = None
        self.target_names = None
        self.dataset_type = None
        self.possible_image_sizes = None

global_state = GlobalState()