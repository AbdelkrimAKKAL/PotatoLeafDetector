from fastapi import FastAPI, File, UploadFile, HTTPException
import uvicorn
import numpy as np
from io import BytesIO
from PIL import Image
import tensorflow as tf
import sys

from starlette.middleware.cors import CORSMiddleware
import os

from dotenv import load_dotenv
load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH")
TARGET_SIZE = (256, 256)

app = FastAPI()

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    MODEL = tf.keras.models.load_model(MODEL_PATH)
except Exception as e:
    sys.exit(1)

CLASS_NAMES = ["Early Blight", "Late Blight", "Healthy"]


def read_file_as_image(data) -> np.array:
    try:
        image = Image.open(BytesIO(data))

        image = image.resize(TARGET_SIZE)

        if image.mode != 'RGB':
            image = image.convert('RGB')

        image_array = np.array(image)

        return image_array
    except Exception as e:
        raise HTTPException(status_code=400, detail="Image processing failed. Ensure the file is a valid image format.")


@app.post("/predict")
async def predict(
        file: UploadFile = File(...)
):
    image = read_file_as_image(await file.read())

    image_batch = np.expand_dims(image, 0)

    try:
        prediction = MODEL.predict(image_batch)
    except Exception as e:
        raise HTTPException(status_code=500,
                            detail="Model prediction failed. Check your image shape and normalization.")

    index = np.argmax(prediction[0])
    predicted_class = CLASS_NAMES[index]
    confidence = np.max(prediction[0])

    return {
        'class': predicted_class,
        'confidence': float(confidence)
    }


if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=8000)