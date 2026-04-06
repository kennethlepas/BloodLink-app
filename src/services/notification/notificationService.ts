import { createNotification } from '@/src/services/firebase/database';
import { NotificationType } from '@/src/types/types';

// NOTIFICATION SERVICE

/**
 * 1. Notify donor they can donate after donation period has elapsed
 */
export const notifyDonorEligibleToDonate = async (
  donorId: string,
  donorName: string
): Promise<void> => {
  try {
    await createNotification({
      userId: donorId,
      type: 'donation_reminder',
      title: 'You Can Donate Again! 🩸',
      message: `Hi ${donorName}! Your donation eligibility period has ended. You can now help save lives by donating blood again.`,
      data: {
        action: 'open_donor_home',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Donation eligibility notification sent to donor:', donorId);
  } catch (error) {
    console.error('Error sending donation eligibility notification:', error);
    throw error;
  }
};

/**
 * 2. Notify eligible donors when a requester creates a new blood request
 */
export const notifyEligibleDonorsOfNewRequest = async (
  requestId: string,
  requestDetails: {
    bloodType: string;
    urgencyLevel: string;
    hospitalName: string;
    requesterName: string;
    unitsNeeded: number;
  },
  eligibleDonorIds: string[]
): Promise<void> => {
  try {
    const urgencyEmoji =
      requestDetails.urgencyLevel === 'critical' ? '🚨' :
        requestDetails.urgencyLevel === 'urgent' ? '⚠️' : '📢';

    const notificationPromises = eligibleDonorIds.map((donorId) =>
      createNotification({
        userId: donorId,
        type: 'blood_request',
        title: `${urgencyEmoji} New ${requestDetails.urgencyLevel.toUpperCase()} Blood Request`,
        message: `${requestDetails.requesterName} needs ${requestDetails.unitsNeeded} unit(s) of ${requestDetails.bloodType} blood at ${requestDetails.hospitalName}. Can you help?`,
        data: {
          requestId,
          bloodType: requestDetails.bloodType,
          urgencyLevel: requestDetails.urgencyLevel,
          action: 'view_request',
        },
        isRead: false,
        timestamp: ''
      })
    );

    await Promise.all(notificationPromises);
    console.log(`New request notifications sent to ${eligibleDonorIds.length} donors`);
  } catch (error) {
    console.error('Error sending new request notifications:', error);
    throw error;
  }
};

/**
 * 3. Notify requester when a donor accepts their blood request
 */
export const notifyRequesterOfAcceptance = async (
  requesterId: string,
  requestId: string,
  donorDetails: {
    donorName: string;
    donorId: string;
    bloodType: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: requesterId,
      type: 'request_accepted',
      title: '✅ Your Request Has Been Accepted!',
      message: `Great news! ${donorDetails.donorName} has accepted your blood donation request. You can now chat with them to coordinate the donation.`,
      data: {
        requestId,
        donorId: donorDetails.donorId,
        donorName: donorDetails.donorName,
        action: 'open_chat',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Request acceptance notification sent to requester:', requesterId);
  } catch (error) {
    console.error('Error sending acceptance notification:', error);
    throw error;
  }
};

/**
 * 3b. Notify requester when a donor declines their blood request
 */
export const notifyRequesterOfDecline = async (
  requesterId: string,
  requestId: string,
  donorDetails: {
    donorName: string;
    bloodType: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: requesterId,
      type: 'blood_request',
      title: 'Request Update',
      message: `${donorDetails.donorName} is unable to fulfill your ${donorDetails.bloodType} blood request at this time. We're still searching for other donors.`,
      data: {
        requestId,
        action: 'view_request',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Request decline notification sent to requester:', requesterId);
  } catch (error) {
    console.error('Error sending decline notification:', error);
    throw error;
  }
};

/**
 * 4. Notify requester when donor marks donation as complete
 */
export const notifyRequesterOfDonationCompletion = async (
  requesterId: string,
  acceptedRequestId: string,
  donorDetails: {
    donorName: string;
    donorId: string;
    bloodType: string;
    hospitalName: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: requesterId,
      type: 'verify_donation',
      title: '🎉 Donation Completed - Please Verify',
      message: `${donorDetails.donorName} has completed the blood donation at ${donorDetails.hospitalName}. Please verify the donation to complete the process.`,
      data: {
        acceptedRequestId,
        donorId: donorDetails.donorId,
        action: 'verify_donation',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Donation completion notification sent to requester:', requesterId);
  } catch (error) {
    console.error('Error sending completion notification to requester:', error);
    throw error;
  }
};

/**
 * 4b. Notify donor when requester verifies the donation
 */
export const notifyDonorOfVerification = async (
  donorId: string,
  acceptedRequestId: string,
  requesterDetails: {
    requesterName: string;
    bloodType: string;
    pointsEarned: number;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: donorId,
      type: 'donation_verified',
      title: '🌟 Donation Verified!',
      message: `${requesterDetails.requesterName} has verified your donation! You've earned ${requesterDetails.pointsEarned} points. Thank you for saving a life!`,
      data: {
        acceptedRequestId,
        pointsEarned: requesterDetails.pointsEarned,
        action: 'view_donation_history',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Verification notification sent to donor:', donorId);
  } catch (error) {
    console.error('Error sending verification notification to donor:', error);
    throw error;
  }
};

/**
 * 4c. Notify donor when requester disputes the donation
 */
export const notifyDonorOfDispute = async (
  donorId: string,
  acceptedRequestId: string,
  requesterDetails: {
    requesterName: string;
    disputeReason: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: donorId,
      type: 'donation_disputed',
      title: '⚠️ Donation Disputed',
      message: `${requesterDetails.requesterName} has raised a concern about the donation. Reason: ${requesterDetails.disputeReason}. Please contact support.`,
      data: {
        acceptedRequestId,
        action: 'contact_support',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Dispute notification sent to donor:', donorId);
  } catch (error) {
    console.error('Error sending dispute notification to donor:', error);
    throw error;
  }
};

/**
 * 5. Notify user of new chat message
 */
export const notifyUserOfNewMessage = async (
  receiverId: string,
  chatId: string,
  messageDetails: {
    senderName: string;
    senderId: string;
    messagePreview: string;
    relatedRequestId?: string;
  }
): Promise<void> => {
  try {
    const preview = messageDetails.messagePreview.length > 50
      ? messageDetails.messagePreview.substring(0, 50) + '...'
      : messageDetails.messagePreview;

    await createNotification({
      userId: receiverId,
      type: 'new_message',
      title: `💬 New message from ${messageDetails.senderName}`,
      message: preview,
      data: {
        chatId,
        senderId: messageDetails.senderId,
        requestId: messageDetails.relatedRequestId,
        action: 'open_chat',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('New message notification sent to user:', receiverId);
  } catch (error) {
    console.error('Error sending message notification:', error);
    throw error;
  }
};

/**
 * Additional: Notify when blood request is about to expire
 */
export const notifyRequesterOfExpiringRequest = async (
  requesterId: string,
  requestId: string,
  requestDetails: {
    bloodType: string;
    hospitalName: string;
    hoursRemaining: number;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: requesterId,
      type: 'system_alert',
      title: '⏰ Request Expiring Soon',
      message: `Your ${requestDetails.bloodType} blood request at ${requestDetails.hospitalName} will expire in ${requestDetails.hoursRemaining} hour(s). Consider creating a new request if still needed.`,
      data: {
        requestId,
        action: 'view_request',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Expiring request notification sent to requester:', requesterId);
  } catch (error) {
    console.error('Error sending expiring request notification:', error);
    throw error;
  }
};

/**
 * Additional: Notify donor of nearby urgent request
 */
export const notifyDonorOfNearbyUrgentRequest = async (
  donorId: string,
  requestId: string,
  requestDetails: {
    bloodType: string;
    hospitalName: string;
    distance: number;
    urgencyLevel: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: donorId,
      type: 'donor_nearby',
      title: '📍 Urgent Request Nearby',
      message: `Critical ${requestDetails.bloodType} blood needed at ${requestDetails.hospitalName}, just ${requestDetails.distance.toFixed(1)}km away. Can you help?`,
      data: {
        requestId,
        distance: requestDetails.distance,
        action: 'view_request',
      },
      isRead: false,
      timestamp: ''
    });
    console.log('Nearby urgent request notification sent to donor:', donorId);
  } catch (error) {
    console.error('Error sending nearby request notification:', error);
    throw error;
  }
};

/**
 * System notification for important updates
 */
export const sendSystemNotification = async (
  userId: string,
  title: string,
  message: string,
  data?: any
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'system_alert',
      title,
      message,
      data,
      isRead: false,
      timestamp: ''
    });
    console.log('System notification sent to user:', userId);
  } catch (error) {
    console.error('Error sending system notification:', error);
    throw error;
  }
};


// BATCH NOTIFICATION HELPERS

/**
 * Send notifications to multiple users
 */
export const sendBatchNotifications = async (
  userIds: string[],
  notificationType: NotificationType,
  title: string,
  message: string,
  data?: any
): Promise<void> => {
  try {
    const notificationPromises = userIds.map((userId) =>
      createNotification({
        userId,
        type: notificationType,
        title,
        message,
        data,
        isRead: false,
        timestamp: ''
      })
    );

    await Promise.all(notificationPromises);
    console.log(`Batch notifications sent to ${userIds.length} users`);
  } catch (error) {
    console.error('Error sending batch notifications:', error);
    throw error;
  }
};


// ==================== TICKET NOTIFICATIONS ====================

/**
 * Notify admins of a new ticket (especially disputes)
 */
export const notifyAdminsOfNewTicket = async (
  ticketId: string,
  ticketDetails: {
    type: string;
    priority: string;
    subject: string;
    userName: string;
  }
): Promise<void> => {
  try {
    // In a real implementation, you would query for admin user IDs
    // For now, this is a placeholder that would be called with admin IDs
    const priorityEmoji = 
      ticketDetails.priority === 'critical' ? '🚨' :
      ticketDetails.priority === 'high' ? '⚠️' :
      ticketDetails.priority === 'medium' ? '📋' : '📝';

    const typeLabel = 
      ticketDetails.type === 'dispute' ? 'Dispute' :
      ticketDetails.type === 'bug_report' ? 'Bug Report' :
      ticketDetails.type === 'feature_request' ? 'Feature Request' :
      ticketDetails.type === 'verification_issue' ? 'Verification Issue' :
      ticketDetails.type === 'account_issue' ? 'Account Issue' : 'Support Request';

    await createNotification({
      userId: 'admin', // This would be replaced with actual admin user IDs
      type: 'ticket_created',
      title: `${priorityEmoji} New ${typeLabel}`,
      message: `${ticketDetails.userName} created a ${ticketDetails.priority} priority ${typeLabel}: ${ticketDetails.subject}`,
      data: {
        ticketId,
        action: 'view_ticket',
      },
      isRead: false,
      timestamp: ''
    });
    
    console.log(`New ticket notification sent for ticket: ${ticketId}`);
  } catch (error) {
    console.error('Error sending new ticket notification:', error);
    throw error;
  }
};

/**
 * Notify user when their ticket is assigned to an admin
 */
export const notifyUserOfTicketAssignment = async (
  userId: string,
  ticketId: string,
  ticketDetails: {
    subject: string;
    adminName: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'ticket_assigned',
      title: '👤 Your Ticket Has Been Assigned',
      message: `${ticketDetails.adminName} is now handling your request: "${ticketDetails.subject}". They will review it shortly.`,
      data: {
        ticketId,
        action: 'view_ticket',
      },
      isRead: false,
      timestamp: ''
    });
    console.log(`Ticket assignment notification sent to user: ${userId}`);
  } catch (error) {
    console.error('Error sending ticket assignment notification:', error);
    throw error;
  }
};

/**
 * Notify user when their ticket status is updated
 */
export const notifyUserOfTicketStatusUpdate = async (
  userId: string,
  ticketId: string,
  ticketDetails: {
    subject: string;
    oldStatus: string;
    newStatus: string;
  }
): Promise<void> => {
  try {
    const statusEmoji = 
      ticketDetails.newStatus === 'resolved' ? '✅' :
      ticketDetails.newStatus === 'closed' ? '🏁' :
      ticketDetails.newStatus === 'under_review' ? '🔍' :
      ticketDetails.newStatus === 'awaiting_user' ? '💬' : '📋';

    await createNotification({
      userId,
      type: 'ticket_updated',
      title: `${statusEmoji} Ticket Status Updated`,
      message: `Your ticket "${ticketDetails.subject}" status changed from ${ticketDetails.oldStatus} to ${ticketDetails.newStatus}.`,
      data: {
        ticketId,
        action: 'view_ticket',
      },
      isRead: false,
      timestamp: ''
    });
    console.log(`Ticket status update notification sent to user: ${userId}`);
  } catch (error) {
    console.error('Error sending ticket status update notification:', error);
    throw error;
  }
};

/**
 * Notify user of a new message on their ticket
 */
export const notifyUserOfTicketMessage = async (
  userId: string,
  ticketId: string,
  messageDetails: {
    ticketSubject: string;
    senderName: string;
    messagePreview: string;
  }
): Promise<void> => {
  try {
    const preview = messageDetails.messagePreview.length > 50
      ? messageDetails.messagePreview.substring(0, 50) + '...'
      : messageDetails.messagePreview;

    await createNotification({
      userId,
      type: 'ticket_message',
      title: `💬 New Message on Your Ticket`,
      message: `${messageDetails.senderName} replied to "${messageDetails.ticketSubject}": ${preview}`,
      data: {
        ticketId,
        action: 'view_ticket',
      },
      isRead: false,
      timestamp: ''
    });
    console.log(`Ticket message notification sent to user: ${userId}`);
  } catch (error) {
    console.error('Error sending ticket message notification:', error);
    throw error;
  }
};

/**
 * Notify user when their ticket is resolved
 */
export const notifyUserOfTicketResolution = async (
  userId: string,
  ticketId: string,
  ticketDetails: {
    subject: string;
    resolution: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'ticket_resolved',
      title: '✅ Ticket Resolved',
      message: `Great news! Your ticket "${ticketDetails.subject}" has been resolved. ${ticketDetails.resolution}`,
      data: {
        ticketId,
        action: 'view_ticket_and_confirm',
      },
      isRead: false,
      timestamp: ''
    });
    console.log(`Ticket resolution notification sent to user: ${userId}`);
  } catch (error) {
    console.error('Error sending ticket resolution notification:', error);
    throw error;
  }
};

/**
 * Enhanced dispute notification that creates a ticket automatically
 */
export const notifyDonorOfDisputeWithTicket = async (
  donorId: string,
  acceptedRequestId: string,
  ticketId: string,
  requesterDetails: {
    requesterName: string;
    disputeReason: string;
  }
): Promise<void> => {
  try {
    await createNotification({
      userId: donorId,
      type: 'donation_disputed',
      title: '⚠️ Donation Disputed',
      message: `${requesterDetails.requesterName} has raised a concern about the donation. Reason: ${requesterDetails.disputeReason}. A support ticket has been created for this dispute.`,
      data: {
        acceptedRequestId,
        ticketId,
        action: 'view_ticket',
      },
      isRead: false,
      timestamp: ''
    });
    console.log(`Dispute with ticket notification sent to donor: ${donorId}`);
  } catch (error) {
    console.error('Error sending dispute with ticket notification:', error);
    throw error;
  }
};