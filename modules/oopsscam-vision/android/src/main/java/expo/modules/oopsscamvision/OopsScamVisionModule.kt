package expo.modules.oopsscamvision

import android.net.Uri
import android.content.ActivityNotFoundException
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException

/** Bridges Android image selection and bundled Latin OCR; callers remove cache copies. */
class OopsScamVisionModule : Module() {
    private var pickerLauncher: ActivityResultLauncher<Array<String>>? = null
    private var pickerPromise: Promise? = null

    private fun releasePicker() {
        pickerLauncher?.unregister()
        pickerLauncher = null
        pickerPromise = null
    }

    private fun copyPickedImage(activity: ComponentActivity, uri: Uri): String {
        val input = activity.contentResolver.openInputStream(uri)
            ?: throw IOException("Android returned no readable image stream for $uri.")
        return input.use { source ->
            val image = File.createTempFile("oopsscam-picked-", ".image", activity.cacheDir)
            try {
                image.outputStream().use { target -> source.copyTo(target) }
                Uri.fromFile(image).toString()
            } catch (error: IOException) {
                if (!image.delete()) {
                    error.addSuppressed(IOException("Could not delete the incomplete image cache file ${image.path}."))
                }
                throw error
            }
        }
    }

    override fun definition() = ModuleDefinition {
        Name("OopsScamVision")

        AsyncFunction("pickImage") { promise: Promise ->
            check(pickerPromise == null) { "An image picker is already open. Finish that selection first." }
            val activity = appContext.currentActivity as? ComponentActivity
                ?: throw IllegalStateException("No Android activity is available to pick an image.")
            val launcher = activity.activityResultRegistry.register(
                "OopsScamVision.pickImage",
                ActivityResultContracts.OpenDocument()
            ) { uri ->
                val pending = pickerPromise
                    ?: throw IllegalStateException("Image picker returned without a pending request.")
                try {
                    // Read while the picker grant is valid; the caller deletes this cache copy after decoding.
                    pending.resolve(uri?.let { copyPickedImage(activity, it) })
                } catch (error: SecurityException) {
                    pending.reject("ERR_IMAGE_READ_PERMISSION", "Android denied reading the selected image: ${error.message}", error)
                } catch (error: IOException) {
                    pending.reject("ERR_IMAGE_COPY", "Could not copy the selected image into the app cache: ${error.message}", error)
                } finally {
                    releasePicker()
                }
            }
            pickerLauncher = launcher
            pickerPromise = promise
            try {
                launcher.launch(arrayOf("image/*"))
            } catch (error: ActivityNotFoundException) {
                releasePicker()
                promise.reject("ERR_IMAGE_PICKER_UNAVAILABLE", "Android has no document picker for images.", error)
            } catch (error: SecurityException) {
                releasePicker()
                promise.reject("ERR_IMAGE_PICKER_PERMISSION", "Android denied access to the image picker: ${error.message}", error)
            }
        }.runOnQueue(Queues.MAIN)

        OnActivityDestroys {
            val pending = pickerPromise
            releasePicker()
            pending?.reject("ERR_IMAGE_PICKER_INTERRUPTED", "Android closed the activity during image selection. Open the app and choose the image again.", null)
        }

        AsyncFunction("recognizeText") { imageUri: String, promise: Promise ->
            val uri = Uri.parse(imageUri)
            require(uri.scheme == "file" || uri.scheme == "content") {
                "OCR requires a local file:// or content:// image."
            }
            val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
            val image = InputImage.fromFilePath(context, uri)
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            recognizer.process(image)
                .addOnSuccessListener { result -> promise.resolve(result.text) }
                .addOnFailureListener { error ->
                    promise.reject("ERR_OCR", "Local text recognition failed: ${error.message}", error)
                }
                .addOnCompleteListener { recognizer.close() }
        }
    }
}
