package com.example.java;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.aurapos.R;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Example Classic Java Activity using XML Layouts (R.layout.activity_pos_java).
 * Demonstrates:
 * 1. XML UI binding with findViewById
 * 2. RecyclerView for Products & Cart
 * 3. 58mm Bluetooth Thermal ESC/POS Receipt Printing in pure Java
 */
public class JavaPosActivity extends AppCompatActivity {

    private TextView tvStoreName;
    private TextView tvSubtotal;
    private TextView tvTax;
    private TextView tvTotalAmount;
    private Button btnCompleteSale;
    private RecyclerView rvProducts;
    private RecyclerView rvCartItems;

    // SPP UUID for Bluetooth Thermal Printers
    private static final UUID PRINTER_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Bind the XML layout created in res/layout/activity_pos_java.xml
        setContentView(R.layout.activity_pos_java);

        initViews();
        setupEvents();
    }

    private void initViews() {
        tvStoreName = findViewById(R.id.tvStoreName);
        tvSubtotal = findViewById(R.id.tvSubtotal);
        tvTax = findViewById(R.id.tvTax);
        tvTotalAmount = findViewById(R.id.tvTotalAmount);
        btnCompleteSale = findViewById(R.id.btnCompleteSale);
        rvProducts = findViewById(R.id.rvProducts);
        rvCartItems = findViewById(R.id.rvCartItems);

        if (rvProducts != null) {
            rvProducts.setLayoutManager(new LinearLayoutManager(this));
        }
        if (rvCartItems != null) {
            rvCartItems.setLayoutManager(new LinearLayoutManager(this));
        }

        // Default sample display
        if (tvSubtotal != null) tvSubtotal.setText("₹440.00");
        if (tvTax != null) tvTax.setText("₹22.00 (5% GST)");
        if (tvTotalAmount != null) tvTotalAmount.setText("₹462.00");
    }

    private void setupEvents() {
        if (btnCompleteSale != null) {
            btnCompleteSale.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    processSaleAndPrint();
                }
            });
        }
    }

    private void processSaleAndPrint() {
        Toast.makeText(this, "Sale Recorded Offline! Printing receipt...", Toast.LENGTH_SHORT).show();
        // Trigger ESC/POS thermal printing
        printSampleReceiptOverBluetooth("Aura-BT58P");
    }

    /**
     * Connects to a paired 58mm Bluetooth printer and sends ESC/POS thermal print commands.
     */
    private void printSampleReceiptOverBluetooth(String targetPrinterName) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                    if (adapter == null || !adapter.isEnabled()) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(JavaPosActivity.this, "Bluetooth is disabled", Toast.LENGTH_SHORT).show();
                            }
                        });
                        return;
                    }

                    BluetoothDevice printerDevice = null;
                    for (BluetoothDevice device : adapter.getBondedDevices()) {
                        if (device.getName() != null && device.getName().contains("BT") || device.getName().contains("58")) {
                            printerDevice = device;
                            break;
                        }
                    }

                    if (printerDevice == null) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(JavaPosActivity.this, "No paired thermal printer found", Toast.LENGTH_SHORT).show();
                            }
                        });
                        return;
                    }

                    BluetoothSocket socket = printerDevice.createRfcommSocketToServiceRecord(PRINTER_UUID);
                    socket.connect();
                    OutputStream outputStream = socket.getOutputStream();

                    // ESC/POS Commands
                    byte[] escInit = new byte[]{0x1B, 0x40}; // ESC @ (Initialize)
                    byte[] escAlignCenter = new byte[]{0x1B, 0x61, 0x01}; // ESC a 1 (Center)
                    byte[] escAlignLeft = new byte[]{0x1B, 0x61, 0x00}; // ESC a 0 (Left)
                    byte[] escFeedAndCut = new byte[]{0x1D, 0x56, 0x41, 0x10}; // GS V A (Feed & Cut)

                    outputStream.write(escInit);
                    outputStream.write(escAlignCenter);
                    outputStream.write("AURA CAFE & ROASTERY\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("TAX INVOICE\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));

                    outputStream.write(escAlignLeft);
                    outputStream.write("Item                 Qty  Price\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("Cappuccino (Double)    2  440.00\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("Subtotal:               Rs.440.00\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("GST (5%):                Rs.22.00\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("TOTAL:                  Rs.462.00\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("Payment: CASH (PAID)\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));

                    outputStream.write(escAlignCenter);
                    outputStream.write("Thank you! Visit again.\n\n\n".getBytes(StandardCharsets.UTF_8));
                    outputStream.write(escFeedAndCut);
                    outputStream.flush();

                    socket.close();

                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(JavaPosActivity.this, "Receipt printed successfully!", Toast.LENGTH_SHORT).show();
                        }
                    });
                } catch (Exception e) {
                    final String errorMsg = e.getMessage();
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(JavaPosActivity.this, "Printer Error: " + errorMsg, Toast.LENGTH_LONG).show();
                        }
                    });
                }
            }
        }).start();
    }
}
