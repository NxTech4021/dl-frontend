// import { startMolpay } from 'fiuu-mobile-xdk-expo';
// import React from 'react';
// import { Alert, Button, View } from 'react-native';

// export default function PaymentButton() {
//   const handlePress = () => {
//     // Construct the payment details object
//     const paymentDetails = {
//       mp_dev_mode: true,  // or true for sandbox
//       mp_username: 'YOUR_USERNAME',
//       mp_password: 'YOUR_PASSWORD',
//       mp_merchant_ID: 'YOUR_MERCHANT_ID',
//       mp_app_name: 'YourAppName',
//       mp_verification_key: 'YOUR_VERIF_KEY',
//       mp_amount: '10.00',
//       mp_order_ID: 'order1234',
//       mp_currency: 'MYR',
//       mp_country: 'MY',
//       mp_channel: 'multi',
//       mp_bill_description: 'Payment for order 1234',
//       mp_bill_name: 'Customer Name',
//       mp_bill_email: 'customer@example.com',
//       mp_bill_mobile: '+8801XXXXXXXXX',
//       // Optionals:
//       mp_channel_editing: false,
//       mp_editing_enabled: false,
//       mp_is_escrow: '0',
//       mp_bin_lock: [],
//       mp_sandbox_mode: true,
//       mp_express_mode: true,
//       mp_language: 'EN',
//       // etc. add other optional ones as needed
//     };

//     // Start the payment
//     startMolpay(paymentDetails, (result: any) => {
//       console.log('Fiuu Payment Result:', result);
//       Alert.alert('Payment Result', JSON.stringify(result));
//       // Here, you can check result.status_code or other fields to detect success/failure
//       // Optionally call your backend to verify the checksum using secret key
//     });
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Button
//         title="Pay with Fiuu"
//         onPress={handlePress}
//       />
//     </View>
//   );
// }
