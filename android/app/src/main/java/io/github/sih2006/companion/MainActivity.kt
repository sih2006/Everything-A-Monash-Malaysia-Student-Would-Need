package io.github.sih2006.companion

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.sih2006.companion.core.NativeEngine

// First step only: proves the C++ engine runs inside the app. The real screens come next.
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sample = "unit\tFIT2004\tAlgorithms\t6\t70\tS1 2027\nassess\tFIT2004\ta1\tAssignment 1\t40\t70\t100\t-\n"
        val report = NativeEngine.report(sample)
        setContent {
            MaterialTheme {
                Surface(Modifier.fillMaxSize()) {
                    Column(Modifier.padding(24.dp)) {
                        Text("C++ engine says:", style = MaterialTheme.typography.titleLarge)
                        Text(report.take(400))
                    }
                }
            }
        }
    }
}
