from typing import Any, Dict, List

from app.services.action_registry import registry


class WorkflowEngine:
    """
    Executes a sequence of registered actions.
    """

    def __init__(self):
        self.steps: List[Dict[str, Any]] = []

    def add_step(self, name: str, action: str):
        self.steps.append({
            "name": name,
            "action": action
        })

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:

        context = {
            "input": input_data,
            "data": input_data,
            "results": []
        }

        for step in self.steps:

            step_name = step["name"]
            action_name = step["action"]

            try:

                result = registry.execute(
                    action_name,
                    context
                )

                context["results"].append({
                    "step": step_name,
                    "action": action_name,
                    "status": "success",
                    "result": result
                })

                context["data"] = result

            except Exception as error:

                context["results"].append({
                    "step": step_name,
                    "action": action_name,
                    "status": "error",
                    "error": str(error)
                })

                return {
                    "status": "failed",
                    "context": context
                }

        return {
            "status": "completed",
            "context": context
        }