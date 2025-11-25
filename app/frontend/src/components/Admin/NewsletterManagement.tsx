import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Users,
  TrendingUp,
  Calendar,
  FileText,
  Eye,
  Download,
  Filter,
  Search,
  Plus,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  Copy
} from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';
import { newsletterService } from '@/services/newsletterService';
import { useToast } from '@/context/ToastContext';

interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribedAt: Date;
  isActive: boolean;
}

interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  htmlContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
  createdAt: Date;
}

interface NewsletterStats {
  totalSubscribers: number;
  activeSubscribers: number;
  totalCampaigns: number;
  avgOpenRate: number;
  avgClickRate: number;
  recentGrowth: number;
}

export function NewsletterManagement() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns' | 'compose'>('subscribers');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Compose form state
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [previewMode, setPreviewMode] = useState<'text' | 'html'>('text');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subscribersData, campaignsData, statsData] = await Promise.all([
        newsletterService.getAllSubscribers(),
        newsletterService.getAllCampaigns(),
        newsletterService.getNewsletterStats()
      ]);

      setSubscribers(subscribersData);
      setCampaigns(campaignsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading newsletter data:', error);
      addToast('Failed to load newsletter data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async () => {
    if (!subject.trim() || !content.trim()) {
      addToast('Please fill in subject and content', 'error');
      return;
    }

    try {
      setSendingEmail(true);

      const campaignData = {
        subject,
        content,
        htmlContent,
        scheduledAt: isScheduled && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`)
          : undefined
      };

      if (isScheduled && campaignData.scheduledAt) {
        await newsletterService.scheduleNewsletter(campaignData);
        addToast('Newsletter scheduled successfully!', 'success');
      } else {
        await newsletterService.sendNewsletter(campaignData);
        addToast('Newsletter sent successfully!', 'success');
      }

      // Reset form
      setSubject('');
      setContent('');
      setHtmlContent('');
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');

      // Reload data
      loadData();
      setActiveTab('campaigns');
    } catch (error) {
      console.error('Error sending newsletter:', error);
      addToast('Failed to send newsletter', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      await newsletterService.deleteCampaign(campaignId);
      addToast('Campaign deleted successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      addToast('Failed to delete campaign', 'error');
    }
  };

  const handleExportSubscribers = async () => {
    try {
      const csv = await newsletterService.exportSubscribers();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('Subscribers exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting subscribers:', error);
      addToast('Failed to export subscribers', 'error');
    }
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all'
      || (filterStatus === 'active' && sub.isActive)
      || (filterStatus === 'inactive' && !sub.isActive);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Subscribers</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats?.totalSubscribers || 0}
              </p>
              <p className="text-sm text-green-400 mt-1 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{stats?.recentGrowth || 0}% this month
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Subscribers</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats?.activeSubscribers || 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {stats?.totalSubscribers ?
                  Math.round((stats.activeSubscribers / stats.totalSubscribers) * 100) : 0}% active
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Open Rate</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats?.avgOpenRate || 0}%
              </p>
              <p className="text-sm text-gray-400 mt-1">Industry avg: 21%</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Campaigns</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats?.totalCampaigns || 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {campaigns.filter(c => c.status === 'sent').length} sent
              </p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Mail className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Tabs */}
      <GlassPanel className="p-6">
        <div className="border-b border-gray-700 mb-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'subscribers'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Subscribers</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Campaigns</span>
                {campaigns.filter(c => c.status === 'draft').length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                    {campaigns.filter(c => c.status === 'draft').length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('compose')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'compose'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Compose</span>
              </div>
            </button>
          </div>
        </div>

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search subscribers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <Button
                onClick={handleExportSubscribers}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Subscribed At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-3 px-4 text-white">{subscriber.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subscriber.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {subscriber.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(subscriber.subscribedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSubscribers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No subscribers found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No campaigns yet</p>
                <Button
                  onClick={() => setActiveTab('compose')}
                  className="mt-4"
                >
                  Create Your First Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-white">{campaign.subject}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            campaign.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                            campaign.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                            campaign.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{campaign.content}</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {campaign.recipientCount} recipients
                          </span>
                          {campaign.status === 'sent' && campaign.openRate !== undefined && (
                            <>
                              <span className="flex items-center">
                                <Eye className="w-4 h-4 mr-1" />
                                {campaign.openRate}% opens
                              </span>
                              {campaign.clickRate !== undefined && (
                                <span className="flex items-center">
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  {campaign.clickRate}% clicks
                                </span>
                              )}
                            </>
                          )}
                          {campaign.sentAt && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(campaign.sentAt).toLocaleString()}
                            </span>
                          )}
                          {campaign.scheduledAt && campaign.status === 'scheduled' && (
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {campaign.status === 'draft' && (
                          <button
                            className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Email Content
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewMode('text')}
                    className={`px-3 py-1 rounded text-sm ${
                      previewMode === 'text'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setPreviewMode('html')}
                    className={`px-3 py-1 rounded text-sm ${
                      previewMode === 'html'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    HTML
                  </button>
                </div>
              </div>

              {previewMode === 'text' ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your email content..."
                  rows={12}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
              ) : (
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Enter HTML content..."
                  rows={12}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
              )}
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="w-4 h-4 text-purple-500 border-gray-700 rounded focus:ring-purple-500 bg-gray-800"
                />
                <span className="text-gray-300">Schedule for later</span>
              </label>

              {isScheduled && (
                <>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                This email will be sent to {stats?.activeSubscribers || 0} active subscribers
              </p>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => {
                    setSubject('');
                    setContent('');
                    setHtmlContent('');
                    setIsScheduled(false);
                    setScheduledDate('');
                    setScheduledTime('');
                  }}
                  variant="outline"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleSendNewsletter}
                  disabled={sendingEmail || !subject.trim() || !content.trim()}
                  className="flex items-center space-x-2"
                >
                  {sendingEmail ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isScheduled ? 'Schedule' : 'Send'} Newsletter</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
