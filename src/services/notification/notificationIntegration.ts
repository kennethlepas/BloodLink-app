/**
 * NOTIFICATION INTEGRATION GUIDE
 * 
 * This file demonstrates how to integrate notifications into your existing workflow.
 * Copy the relevant code snippets into your existing files.
 */

import {
    notifyDonorOfDispute,
    notifyDonorOfVerification,
    notifyEligibleDonorsOfNewRequest,
    notifyRequesterOfAcceptance,
    notifyRequesterOfDonationCompletion,
    notifyUserOfNewMessage
} from './notificationService';

import {
    completeDonationAfterVerification,
    createAcceptedRequest,
    createBloodRequest,
    createChat,
    createRejectedRequest,
    disputeDonationByRequester,
    getUsersByBloodType,
    markDonationPendingVerification,
    sendMessage,
    verifyDonationByRequester,
} from '@/src/services/firebase/database';

// ============================================================================
// 1. WHEN CREATING A BLOOD REQUEST (REQUESTER SIDE)
// ============================================================================

/**
 * Example: Modified createBloodRequest workflow
 * Add this to your request creation screen/component
 */
export const handleCreateBloodRequest = async (requestData: any) => {
  try {
    // Create the blood request
    const requestId = await createBloodRequest(requestData);

    // Get eligible donors for this blood type
    const eligibleDonors = await getUsersByBloodType(requestData.bloodType);

    // Notify all eligible donors
    if (eligibleDonors.length > 0) {
      await notifyEligibleDonorsOfNewRequest(
        requestId,
        {
          bloodType: requestData.bloodType,
          urgencyLevel: requestData.urgencyLevel,
          hospitalName: requestData.hospitalName,
          requesterName: requestData.requesterName,
          unitsNeeded: requestData.unitsNeeded,
        },
        eligibleDonors.map((donor) => donor.id)
      );
    }

    console.log('✅ Request created and donors notified');
    return requestId;
  } catch (error) {
    console.error('Error creating request:', error);
    throw error;
  }
};

// ============================================================================
// 2. WHEN DONOR ACCEPTS A REQUEST
// ============================================================================

/**
 * Example: Modified accept request workflow
 * Add this to your donor's accept request handler
 */
export const handleAcceptRequest = async (
  request: any,
  donorId: string,
  donorName: string
) => {
  try {
    // Create chat
    const chatId = await createChat(
      donorId,
      donorName,
      request.requesterId,
      request.requesterName,
      request.id
    );

    // Create accepted request
    const acceptedRequestId = await createAcceptedRequest(
      donorId,
      donorName,
      request,
      chatId
    );

    // Notify the requester
    await notifyRequesterOfAcceptance(request.requesterId, request.id, {
      donorName,
      donorId,
      bloodType: request.bloodType,
    });

    console.log('✅ Request accepted and requester notified');
    return { acceptedRequestId, chatId };
  } catch (error) {
    console.error('Error accepting request:', error);
    throw error;
  }
};

// ============================================================================
// 3. WHEN DONOR DECLINES A REQUEST
// ============================================================================

/**
 * Example: Modified decline request workflow
 * Add this to your donor's decline request handler
 */
export const handleDeclineRequest = async (
  request: any,
  donorId: string,
  reason?: string
) => {
  try {
    // Mark as rejected for this donor
    await createRejectedRequest(donorId, request.id, reason);

    // Optionally notify the requester (you may choose not to)
    // Uncomment the following if you want to notify requester of declines
    /*
    await notifyRequesterOfDecline(request.requesterId, request.id, {
      donorName: 'A donor',
      bloodType: request.bloodType,
    });
    */

    console.log('✅ Request declined');
  } catch (error) {
    console.error('Error declining request:', error);
    throw error;
  }
};

// ============================================================================
// 4. WHEN DONOR MARKS DONATION AS COMPLETE
// ============================================================================

/**
 * Example: Modified mark complete workflow (DONOR SIDE)
 * Add this to your donor's complete donation handler
 */
export const handleDonorMarkComplete = async (
  acceptedRequest: any,
  donorNotes?: string
) => {
  try {
    // Mark as pending verification
    await markDonationPendingVerification(acceptedRequest.id, donorNotes);

    // Notify the requester to verify
    await notifyRequesterOfDonationCompletion(
      acceptedRequest.requesterId,
      acceptedRequest.id,
      {
        donorName: acceptedRequest.donorName,
        donorId: acceptedRequest.donorId,
        bloodType: acceptedRequest.bloodType,
        hospitalName: acceptedRequest.hospitalName,
      }
    );

    console.log('✅ Donation marked complete, awaiting requester verification');
  } catch (error) {
    console.error('Error marking donation complete:', error);
    throw error;
  }
};

// ============================================================================
// 5. WHEN REQUESTER VERIFIES DONATION (REQUESTER SIDE)
// ============================================================================

/**
 * Example: Modified verify donation workflow
 * Add this to your requester's verify donation handler
 */
export const handleRequesterVerifyDonation = async (
  acceptedRequest: any,
  verificationNotes?: string
) => {
  try {
    // Mark as verified
    await verifyDonationByRequester(acceptedRequest.id, verificationNotes);

    // Complete the donation and create donation record
    const donationRecordId = await completeDonationAfterVerification(
      acceptedRequest,
      acceptedRequest.donorId,
      acceptedRequest.donorName
    );

    // Notify the donor
    await notifyDonorOfVerification(acceptedRequest.donorId, acceptedRequest.id, {
      requesterName: acceptedRequest.requesterName,
      bloodType: acceptedRequest.bloodType,
      pointsEarned: 50, // Adjust based on your points system
    });

    console.log('✅ Donation verified and donor notified');
    return donationRecordId;
  } catch (error) {
    console.error('Error verifying donation:', error);
    throw error;
  }
};

// ============================================================================
// 6. WHEN REQUESTER DISPUTES DONATION (REQUESTER SIDE)
// ============================================================================

/**
 * Example: Modified dispute donation workflow
 * Add this to your requester's dispute donation handler
 */
export const handleRequesterDisputeDonation = async (
  acceptedRequest: any,
  disputeReason: string
) => {
  try {
    // Mark as disputed
    await disputeDonationByRequester(acceptedRequest.id, disputeReason);

    // Notify the donor
    await notifyDonorOfDispute(acceptedRequest.donorId, acceptedRequest.id, {
      requesterName: acceptedRequest.requesterName,
      disputeReason,
    });

    console.log('✅ Donation disputed and donor notified');
  } catch (error) {
    console.error('Error disputing donation:', error);
    throw error;
  }
};

// ============================================================================
// 7. WHEN SENDING A CHAT MESSAGE
// ============================================================================

/**
 * Example: Modified send message workflow
 * Add this to your chat message handler
 */
export const handleSendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  receiverId: string,
  message: string,
  relatedRequestId?: string
) => {
  try {
    // Send the message
    await sendMessage(chatId, senderId, senderName, receiverId, message);

    // Notify the receiver of new message
    await notifyUserOfNewMessage(receiverId, chatId, {
      senderName,
      senderId,
      messagePreview: message,
      relatedRequestId,
    });

    console.log('✅ Message sent and receiver notified');
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// ============================================================================
// EXAMPLE: How to use in a React component
// ============================================================================

/*
import React from 'react';
import { View, Button } from 'react-native';
import { useUser } from '@/src/contexts/UserContext';

const ExampleComponent = () => {
  const { user } = useUser();

  const handleCreateRequest = async () => {
    const requestData = {
      requesterId: user.id,
      requesterName: `${user.firstName} ${user.lastName}`,
      requesterPhone: user.phoneNumber,
      bloodType: 'A+',
      urgencyLevel: 'urgent',
      unitsNeeded: 2,
      hospitalName: 'City Hospital',
      hospitalAddress: '123 Main St',
      patientName: 'John Doe',
      description: 'Urgent need for surgery',
      location: user.location,
    };

    try {
      const requestId = await handleCreateBloodRequest(requestData);
      // Show success message
      Alert.alert('Success', 'Your blood request has been created and donors have been notified!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create request');
    }
  };

  return (
    <View>
      <Button title="Create Request" onPress={handleCreateRequest} />
    </View>
  );
};
*/