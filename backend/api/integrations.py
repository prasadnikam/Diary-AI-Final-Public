"""
Integration Manager for external tools (Jira, Slack, etc.)
Currently implemented as stubs for future activation.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from .engine_models import ProcessedTask


class IntegrationManager(ABC):
    """
    Abstract base class for external integrations.
    Subclasses implement specific tool integrations.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize integration with configuration.
        
        Args:
            config: Dictionary containing API keys, URLs, etc.
        """
        self.config = config or {}
        self.enabled = self.config.get('enabled', False)
    
    @abstractmethod
    def sync(self, task: ProcessedTask) -> Dict[str, Any]:
        """
        Sync task to external tool.
        
        Args:
            task: ProcessedTask object to sync
            
        Returns:
            Dictionary with sync results
        """
        pass
    
    @abstractmethod
    def validate_config(self) -> bool:
        """
        Validate that configuration is correct.
        
        Returns:
            True if config is valid, False otherwise
        """
        pass


class JiraIntegration(IntegrationManager):
    """
    Jira integration for syncing professional tasks.
    
    STUB IMPLEMENTATION: Ready for activation when credentials are available.
    
    To activate:
    1. Add Jira credentials to config: {'api_token': '...', 'project_key': '...', 'domain': '...'}
    2. Install jira library: pip install jira
    3. Uncomment actual implementation below
    4. Set enabled=True in config
    """
    
    def sync_to_jira(self, task: ProcessedTask) -> Dict[str, Any]:
        """
        Format task data into Jira ticket payload.
        
        Args:
            task: ProcessedTask to convert to Jira ticket
            
        Returns:
            Dictionary with Jira ticket data or stub response
        """
        if not self.enabled:
            return {
                'success': False,
                'message': 'Jira integration not enabled',
                'stub': True,
                'would_create': self._format_jira_payload(task)
            }
        
        # STUB: Actual implementation would go here
        # from jira import JIRA
        # jira = JIRA(server=self.config['domain'], basic_auth=(self.config['email'], self.config['api_token']))
        # issue = jira.create_issue(fields=self._format_jira_payload(task))
        # return {'success': True, 'ticket_url': issue.permalink(), 'ticket_key': issue.key}
        
        return {
            'success': False,
            'message': 'Jira integration is a stub. Implement actual API calls to activate.',
            'stub': True
        }
    
    def _format_jira_payload(self, task: ProcessedTask) -> Dict[str, Any]:
        """
        Format ProcessedTask into Jira API payload.
        
        Args:
            task: ProcessedTask to format
            
        Returns:
            Jira-compatible payload dictionary
        """
        # Convert subtasks to Jira description format
        subtasks_text = "\n".join([
            f"- [ ] {subtask.title} (Est: {subtask.estimated_minutes}min)"
            for subtask in task.subtasks
        ])
        
        description = f"""
{task.title}

h3. Subtasks
{subtasks_text}

h3. Details
* Category: {task.category}
* Energy Level: {task.energy_level.value}
* Estimated Duration: {task.estimated_duration_minutes} minutes
* Tags: {', '.join(task.tags)}
        """.strip()
        
        return {
            'project': {'key': self.config.get('project_key', 'PROJ')},
            'summary': task.title,
            'description': description,
            'issuetype': {'name': 'Task'},
            'priority': {'name': task.priority.value.capitalize()},
            'labels': task.tags
        }
    
    def sync(self, task: ProcessedTask) -> Dict[str, Any]:
        """Sync task to Jira"""
        return self.sync_to_jira(task)
    
    def validate_config(self) -> bool:
        """Validate Jira configuration"""
        required_keys = ['api_token', 'project_key', 'domain', 'email']
        return all(key in self.config for key in required_keys)


class SlackIntegration(IntegrationManager):
    """
    Slack integration for notifications and updates.
    
    STUB IMPLEMENTATION: Ready for activation when webhook URL is available.
    
    To activate:
    1. Create Slack webhook URL
    2. Add to config: {'webhook_url': '...', 'channel': '#dev-team'}
    3. Install slack-sdk: pip install slack-sdk
    4. Uncomment actual implementation below
    5. Set enabled=True in config
    """
    
    def notify_slack(self, message: str, task: Optional[ProcessedTask] = None) -> Dict[str, Any]:
        """
        Send formatted message to Slack channel.
        
        Args:
            message: Message text to send
            task: Optional ProcessedTask to include in message
            
        Returns:
            Dictionary with send results or stub response
        """
        if not self.enabled:
            return {
                'success': False,
                'message': 'Slack integration not enabled',
                'stub': True,
                'would_send': self._format_slack_message(message, task)
            }
        
        # STUB: Actual implementation would go here
        # import requests
        # payload = self._format_slack_message(message, task)
        # response = requests.post(self.config['webhook_url'], json=payload)
        # return {'success': response.status_code == 200, 'response': response.text}
        
        return {
            'success': False,
            'message': 'Slack integration is a stub. Implement actual webhook calls to activate.',
            'stub': True
        }
    
    def _format_slack_message(self, message: str, task: Optional[ProcessedTask] = None) -> Dict[str, Any]:
        """
        Format message for Slack API.
        
        Args:
            message: Message text
            task: Optional task to include
            
        Returns:
            Slack-compatible payload
        """
        blocks = [
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': message
                }
            }
        ]
        
        if task:
            task_details = {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*Task:*\n{task.title}'},
                    {'type': 'mrkdwn', 'text': f'*Category:*\n{task.category}'},
                    {'type': 'mrkdwn', 'text': f'*Priority:*\n{task.priority.value}'},
                    {'type': 'mrkdwn', 'text': f'*Subtasks:*\n{len(task.subtasks)} items'}
                ]
            }
            blocks.append(task_details)
        
        return {
            'channel': self.config.get('channel', '#general'),
            'blocks': blocks
        }
    
    def sync(self, task: ProcessedTask) -> Dict[str, Any]:
        """Sync task to Slack as notification"""
        message = f"📋 New task created: *{task.title}*"
        return self.notify_slack(message, task)
    
    def validate_config(self) -> bool:
        """Validate Slack configuration"""
        return 'webhook_url' in self.config


class IntegrationFactory:
    """
    Factory for creating integration instances.
    Manages integration configuration and instantiation.
    """
    
    _integrations = {
        'jira': JiraIntegration,
        'slack': SlackIntegration
    }
    
    @classmethod
    def get_integration(cls, integration_type: str, config: Optional[Dict[str, Any]] = None) -> Optional[IntegrationManager]:
        """
        Get integration instance by type.
        
        Args:
            integration_type: Type of integration ('jira', 'slack')
            config: Configuration dictionary
            
        Returns:
            Integration instance or None if type not found
        """
        integration_class = cls._integrations.get(integration_type.lower())
        if integration_class:
            return integration_class(config)
        return None
    
    @classmethod
    def get_all_integrations(cls, configs: Dict[str, Dict[str, Any]]) -> Dict[str, IntegrationManager]:
        """
        Get all configured integrations.
        
        Args:
            configs: Dictionary mapping integration type to config
            
        Returns:
            Dictionary of integration instances
        """
        return {
            name: cls.get_integration(name, config)
            for name, config in configs.items()
            if cls.get_integration(name, config) is not None
        }
