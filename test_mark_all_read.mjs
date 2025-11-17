import { storage } from './server/storage.ts';

async function testMarkAllAsRead() {
  try {
    console.log('Testing markAllAsRead functionality...');

    // First, let's create a test user
    const testUser = await storage.createUser({
      email: 'test@example.com',
      password: 'testpass',
      firstName: 'Test',
      lastName: 'User',
      country: 'Nigeria'
    });
    console.log('Created test user:', testUser.id);

    // Create some notifications for the user
    const notification1 = await storage.createNotification({
      userId: testUser.id,
      type: 'test',
      title: 'Test Notification 1',
      message: 'This is test notification 1',
      data: { test: true }
    });

    const notification2 = await storage.createNotification({
      userId: testUser.id,
      type: 'test',
      title: 'Test Notification 2',
      message: 'This is test notification 2',
      data: { test: true }
    });

    const notification3 = await storage.createNotification({
      userId: testUser.id,
      type: 'test',
      title: 'Test Notification 3',
      message: 'This is test notification 3',
      data: { test: true }
    });

    console.log('Created 3 notifications');

    // Check unread count before marking as read
    const unreadCountBefore = await storage.getUnreadNotificationsCount(testUser.id);
    console.log('Unread count before:', unreadCountBefore);

    // Mark all as read
    const result = await storage.markAllAsRead(testUser.id);
    console.log('markAllAsRead result:', result);

    // Check unread count after marking as read
    const unreadCountAfter = await storage.getUnreadNotificationsCount(testUser.id);
    console.log('Unread count after:', unreadCountAfter);

    // Get all notifications to verify they are marked as read
    const allNotifications = await storage.getNotificationsByUser(testUser.id);
    console.log('All notifications:');
    allNotifications.forEach(notification => {
      console.log(`- ${notification.title}: isRead = ${notification.isRead}`);
    });

    console.log('Test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMarkAllAsRead();
