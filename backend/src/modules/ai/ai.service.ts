import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between, In } from 'typeorm';
import { Co2Barrel } from '../co2/entities/co2-barrel.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { TemperatureReading } from '../temperature/entities/temperature-reading.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { PurchaseOrder } from '../vendors/entities/purchase-order.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { format, startOfDay, endOfDay, subDays, isToday, isSameDay } from 'date-fns';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Co2Barrel)
    private co2BarrelRepository: Repository<Co2Barrel>,
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(TemperatureReading)
    private temperatureRepository: Repository<TemperatureReading>,
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async processQuery(query: string): Promise<{ response: string }> {
    const lowerQuery = query.toLowerCase();
    const isTodayQuery = lowerQuery.includes('today') || lowerQuery.includes('current');

    // CO2 related queries
    if (lowerQuery.includes('co2') || lowerQuery.includes('barrel')) {
      const overdueBarrels = await this.co2BarrelRepository.find({
        where: { status: 'overdue' },
        relations: ['location'],
        order: { nextDueDate: 'ASC' },
        take: 10,
      });

      if (overdueBarrels.length > 0) {
        const barrelList = overdueBarrels
          .slice(0, 5)
          .map((b) => {
            const capacity = typeof b.capacityPercentage === 'string' 
              ? parseFloat(b.capacityPercentage) 
              : b.capacityPercentage;
            const dueDate = b.nextDueDate ? format(new Date(b.nextDueDate), 'MMM dd, yyyy') : 'N/A';
            return `${b.id} (due ${dueDate}, ${capacity.toFixed(1)}% capacity)`;
          })
          .join(', ');
        const more = overdueBarrels.length > 5 ? ` and ${overdueBarrels.length - 5} more` : '';
        return {
          response: `There are ${overdueBarrels.length} overdue CO₂ barrel${overdueBarrels.length > 1 ? 's' : ''}: ${barrelList}${more}. I recommend immediate refilling.`,
        };
      }

      const allBarrels = await this.co2BarrelRepository.find({
        order: { nextDueDate: 'ASC' },
        take: 20,
      });
      const dueSoon = allBarrels.filter((b) => {
        if (!b.nextDueDate) return false;
        const daysUntilDue = Math.ceil((new Date(b.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 7 && daysUntilDue > 0;
      });

      if (dueSoon.length > 0) {
        const barrelList = dueSoon
          .slice(0, 3)
          .map((b) => {
            const dueDate = b.nextDueDate ? format(new Date(b.nextDueDate), 'MMM dd') : 'N/A';
            return `${b.id} (due ${dueDate})`;
          })
          .join(', ');
        return {
          response: `There ${dueSoon.length === 1 ? 'is' : 'are'} ${dueSoon.length} CO₂ barrel${dueSoon.length > 1 ? 's' : ''} due within the next week: ${barrelList}${dueSoon.length > 3 ? ` and ${dueSoon.length - 3} more` : ''}.`,
        };
      }

      const totalBarrels = await this.co2BarrelRepository.count();
      return {
        response: `All CO₂ barrels are up to date. Total barrels in system: ${totalBarrels}. No immediate action required.`,
      };
    }

    // Inventory/Stock related queries
    if (lowerQuery.includes('stock') || lowerQuery.includes('inventory') || lowerQuery.includes('low')) {
      const lowStockItems = await this.inventoryRepository.find({
        where: { status: 'low' },
        order: { currentStock: 'ASC' },
        take: 10,
      });

      if (lowStockItems.length > 0) {
        const itemList = lowStockItems
          .slice(0, 5)
          .map((item) => {
            const stock = typeof item.currentStock === 'string' 
              ? parseFloat(item.currentStock) 
              : item.currentStock;
            const min = typeof item.minStock === 'string' 
              ? parseFloat(item.minStock) 
              : item.minStock;
            return `${item.name} (${stock} ${item.unit}, min: ${min})`;
          })
          .join(', ');
        const more = lowStockItems.length > 5 ? ` and ${lowStockItems.length - 5} more` : '';
        return {
          response: `Low stock alert: ${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} need restocking: ${itemList}${more}. I suggest placing orders soon.`,
        };
      }

      const totalItems = await this.inventoryRepository.count();
      const totalValue = await this.inventoryRepository
        .createQueryBuilder('item')
        .select('SUM(item.totalValue)', 'sum')
        .getRawOne();
      const value = totalValue?.sum ? parseFloat(totalValue.sum).toFixed(2) : '0.00';
      
      return {
        response: `All inventory items are at safe stock levels. Total items: ${totalItems}. Total inventory value: ₹${value}.`,
      };
    }

    // Temperature related queries
    if (lowerQuery.includes('temperature') || lowerQuery.includes('weather') || lowerQuery.includes('temp')) {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      
      let recentReadings;
      if (isTodayQuery) {
        recentReadings = await this.temperatureRepository.find({
          where: {
            readingTime: Between(todayStart, todayEnd),
          },
          order: { readingTime: 'DESC' },
          take: 50,
        });
      } else {
        recentReadings = await this.temperatureRepository.find({
          order: { readingTime: 'DESC' },
          take: 50,
        });
      }

      if (recentReadings.length > 0) {
        const temps = recentReadings.map((r) => parseFloat(r.temperature.toString()));
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
        const max = Math.max(...temps);
        const min = Math.min(...temps);
        const alerts = recentReadings.filter((r) => r.status === 'warning' || r.status === 'critical').length;
        const latest = recentReadings[0];
        const latestTime = latest.readingTime ? format(new Date(latest.readingTime), 'HH:mm') : 'N/A';

        const timeContext = isTodayQuery ? "Today's" : 'Recent';
        return {
          response: `${timeContext} average temperature: ${avg.toFixed(1)}°C. Range: ${min.toFixed(1)}°C - ${max.toFixed(1)}°C. Latest reading: ${parseFloat(latest.temperature.toString()).toFixed(1)}°C at ${latestTime}. ${alerts > 0 ? `⚠️ ${alerts} temperature alert${alerts > 1 ? 's' : ''} requiring attention.` : 'All readings are within normal range.'}`,
        };
      }

      return {
        response: `No ${isTodayQuery ? "today's" : 'recent'} temperature readings available. Please check sensor connectivity.`,
      };
    }

    // Attendance related queries
    if (lowerQuery.includes('attendance') || lowerQuery.includes('staff') || lowerQuery.includes('present') || lowerQuery.includes('absent')) {
      let records;
      if (isTodayQuery) {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        records = await this.attendanceRepository.find({
          where: {
            attendanceDate: Between(todayStart, todayEnd),
          },
          relations: ['user'],
          order: { checkInTime: 'ASC' },
        });
      } else {
        records = await this.attendanceRepository.find({
          relations: ['user'],
          order: { attendanceDate: 'DESC', checkInTime: 'ASC' },
          take: 100,
        });
      }

      if (records.length > 0) {
        // Get unique users for today
        const uniqueUsers = new Set(records.map(r => r.user?.id).filter(Boolean));
        const present = records.filter((r) => r.status === 'present').length;
        const absent = records.filter((r) => r.status === 'absent').length;
        const late = records.filter((r) => r.status === 'late').length;
        const onLeave = records.filter((r) => r.status === 'onLeave').length;
        const total = isTodayQuery ? uniqueUsers.size : records.length;
        const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

        const timeContext = isTodayQuery ? "Today's" : 'Recent';
        let response = `${timeContext} attendance: ${present} present`;
        if (absent > 0) response += `, ${absent} absent`;
        if (late > 0) response += `, ${late} late`;
        if (onLeave > 0) response += `, ${onLeave} on leave`;
        response += ` out of ${total} ${isTodayQuery ? 'staff members' : 'records'}. Attendance rate: ${attendanceRate}%.`;
        
        return { response };
      }

      return {
        response: `No ${isTodayQuery ? "today's" : ''} attendance records found in the database.`,
      };
    }

    // Tasks related queries
    if (lowerQuery.includes('task') || lowerQuery.includes('todo') || lowerQuery.includes('pending')) {
      const pendingTasks = await this.taskRepository.find({
        where: { status: 'pending' },
        relations: ['assignedTo'],
        order: { dueDate: 'ASC', priority: 'DESC' },
        take: 10,
      });

      const inProgressTasks = await this.taskRepository.find({
        where: { status: 'in_progress' },
        relations: ['assignedTo'],
        order: { dueDate: 'ASC' },
        take: 5,
      });

      if (pendingTasks.length > 0 || inProgressTasks.length > 0) {
        let response = '';
        if (pendingTasks.length > 0) {
          const taskList = pendingTasks.slice(0, 3).map(t => t.title).join(', ');
          response += `${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}: ${taskList}${pendingTasks.length > 3 ? ` and ${pendingTasks.length - 3} more` : ''}. `;
        }
        if (inProgressTasks.length > 0) {
          response += `${inProgressTasks.length} task${inProgressTasks.length > 1 ? 's' : ''} in progress.`;
        }
        return { response: response.trim() };
      }

      const totalTasks = await this.taskRepository.count();
      return {
        response: `No pending tasks. Total tasks in system: ${totalTasks}. All tasks are on track.`,
      };
    }

    // Vendors/Purchase Orders related queries
    if (lowerQuery.includes('vendor') || lowerQuery.includes('purchase') || lowerQuery.includes('order') || lowerQuery.includes('procurement')) {
      const pendingOrders = await this.purchaseOrderRepository.find({
        where: { status: 'pending_approval' },
        relations: ['vendor'],
        order: { orderDate: 'DESC' },
        take: 10,
      });

      const activeVendors = await this.vendorRepository.count({
        where: { status: 'active' },
      });

      if (pendingOrders.length > 0) {
        const orderList = pendingOrders
          .slice(0, 3)
          .map((o) => {
            const vendorName = o.vendor?.name || 'Unknown';
            const orderDate = o.orderDate ? format(new Date(o.orderDate), 'MMM dd') : 'N/A';
            return `${o.id} from ${vendorName} (${orderDate})`;
          })
          .join(', ');
        return {
          response: `There ${pendingOrders.length === 1 ? 'is' : 'are'} ${pendingOrders.length} purchase order${pendingOrders.length > 1 ? 's' : ''} pending approval: ${orderList}${pendingOrders.length > 3 ? ` and ${pendingOrders.length - 3} more` : ''}. Active vendors: ${activeVendors}.`,
        };
      }

      const totalOrders = await this.purchaseOrderRepository.count();
      return {
        response: `No pending purchase orders. Total orders: ${totalOrders}. Active vendors: ${activeVendors}.`,
      };
    }

    // Posts/Requests related queries
    if (lowerQuery.includes('post') || lowerQuery.includes('request') || lowerQuery.includes('requirement')) {
      const openPosts = await this.postRepository.find({
        where: { status: 'open' },
        relations: ['postedBy'],
        order: { postedAt: 'DESC' },
        take: 10,
      });

      if (openPosts.length > 0) {
        const postList = openPosts
          .slice(0, 3)
          .map((p) => `"${p.title}" by ${p.postedByName}`)
          .join(', ');
        return {
          response: `There ${openPosts.length === 1 ? 'is' : 'are'} ${openPosts.length} open request${openPosts.length > 1 ? 's' : ''}/post${openPosts.length > 1 ? 's' : ''}: ${postList}${openPosts.length > 3 ? ` and ${openPosts.length - 3} more` : ''}.`,
        };
      }

      const totalPosts = await this.postRepository.count();
      return {
        response: `No open requests or posts. Total posts in system: ${totalPosts}.`,
      };
    }

    // Users/Staff related queries
    if (lowerQuery.includes('user') || lowerQuery.includes('employee') || lowerQuery.includes('worker')) {
      const totalUsers = await this.userRepository.count();
      const activeUsers = await this.userRepository.count({
        where: { status: 'active' },
      });
      const staffUsers = await this.userRepository.count({
        where: { role: In(['cleaner', 'caretaker', 'gas-filler', 'staff']) },
      });

      return {
        response: `Total users: ${totalUsers}. Active users: ${activeUsers}. Staff members: ${staffUsers}.`,
      };
    }

    // Risk/Alert queries
    if (lowerQuery.includes('risk') || lowerQuery.includes('alert') || lowerQuery.includes('issue') || lowerQuery.includes('problem')) {
      const overdueBarrels = await this.co2BarrelRepository.count({ where: { status: 'overdue' } });
      const lowStockItems = await this.inventoryRepository.count({ where: { status: 'low' } });
      const allReadings = await this.temperatureRepository.find({
        where: {
          readingTime: MoreThanOrEqual(subDays(new Date(), 1)),
        },
      });
      const tempAlerts = allReadings.filter(
        (r) => r.status === 'warning' || r.status === 'critical',
      ).length;
      const pendingTasks = await this.taskRepository.count({ where: { status: 'pending' } });
      const pendingOrders = await this.purchaseOrderRepository.count({ where: { status: 'pending_approval' } });

      const totalAlerts = overdueBarrels + lowStockItems + tempAlerts + (pendingTasks > 5 ? 1 : 0) + (pendingOrders > 3 ? 1 : 0);

      if (totalAlerts > 0) {
        const issues = [];
        if (overdueBarrels > 0) issues.push(`${overdueBarrels} overdue CO₂ barrel${overdueBarrels > 1 ? 's' : ''}`);
        if (lowStockItems > 0) issues.push(`${lowStockItems} low stock item${lowStockItems > 1 ? 's' : ''}`);
        if (tempAlerts > 0) issues.push(`${tempAlerts} temperature alert${tempAlerts > 1 ? 's' : ''}`);
        if (pendingTasks > 5) issues.push(`${pendingTasks} pending tasks`);
        if (pendingOrders > 3) issues.push(`${pendingOrders} pending purchase orders`);

        return {
          response: `⚠️ I've detected ${totalAlerts} issue${totalAlerts > 1 ? 's' : ''} requiring attention: ${issues.join(', ')}. Would you like detailed information on any of these?`,
        };
      }

      return {
        response: '✅ No critical alerts detected. All systems are operating normally.',
      };
    }

    // Default response
    return {
      response: 'I can help you with vineyard operations including CO₂ management, inventory, temperature monitoring, attendance, tasks, vendors, purchase orders, and requests. What would you like to know?',
    };
  }
}

