from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    """
    Standardize error responses: {"error": "message", "code": "ERROR_CODE"}
    """
    # Call standard DRF exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize the data format
        custom_data = {
            "error": "",
            "code": "",
            "details": response.data
        }

        # Determine error message and code
        if isinstance(response.data, dict):
            if "detail" in response.data:
                custom_data["error"] = str(response.data["detail"])
                custom_data["code"] = response.data.get("code", response.status_code)
            else:
                # Multi-field validation errors
                first_error = next(iter(response.data.values()))
                if isinstance(first_error, list):
                    custom_data["error"] = str(first_error[0])
                else:
                    custom_data["error"] = str(first_error)
                custom_data["code"] = "VALIDATION_ERROR"
        elif isinstance(response.data, list):
            custom_data["error"] = str(response.data[0])
            custom_data["code"] = "VALIDATION_ERROR"
        else:
            custom_data["error"] = str(response.data)
            custom_data["code"] = response.status_code

        response.data = custom_data

    return response
