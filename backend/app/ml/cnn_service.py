import os
import logging
from PIL import Image
import numpy as np
from ..config import settings

logger = logging.getLogger("hien.ml.cnn")

class MugConditionClassifierService:
    def __init__(self):
        self.model = None
        self.classes = ["defective", "good"]

    def load_model(self):
        if self.model is not None:
            return
        os.environ["KERAS_BACKEND"] = "torch"
        try:
            import keras
            logger.info("Loading MobileNetV2 CNN from %s...", settings.CNN_MODEL_PATH)
            self.model = keras.models.load_model(settings.CNN_MODEL_PATH)
            logger.info("CNN condition classifier loaded successfully.")
        except Exception as e:
            logger.error("Failed to load CNN model: %s", e, exc_info=True)
            self.model = None

    def preprocess_image(self, image_file_or_bytes) -> np.ndarray:
        img = Image.open(image_file_or_bytes)
        # Ensure RGB
        if img.mode != "RGB":
            img = img.convert("RGB")
        # Resize to expected 224x224
        img = img.resize((224, 224), Image.Resampling.BILINEAR)
        # Scale to [0, 1]
        arr = np.array(img, dtype=np.float32) / 255.0
        # Add batch dimension (1, 224, 224, 3)
        return np.expand_dims(arr, axis=0)

    def predict(self, image_file_or_bytes) -> dict:
        if self.model is None:
            self.load_model()
        if self.model is None:
            raise RuntimeError("CNN model could not be initialized.")

        tensor = self.preprocess_image(image_file_or_bytes)
        raw_preds = self.model.predict(tensor)
        probs = raw_preds[0]

        # probabilities for defective (0) and good (1)
        prob_defective = float(probs[0])
        prob_good = float(probs[1])

        predicted_class = "defective" if prob_defective >= prob_good else "good"
        confidence = prob_defective if predicted_class == "defective" else prob_good

        return {
            "predicted_condition": predicted_class,
            "confidence": round(confidence, 4),
            "probabilities": {
                "defective": round(prob_defective, 4),
                "good": round(prob_good, 4)
            },
            "model_version": "MobileNetV2-Mug-v1.0",
            "scope_notice": "Trained specifically on ceramic/mug physical damage. Human QA required before final disposition."
        }

cnn_service = MugConditionClassifierService()
